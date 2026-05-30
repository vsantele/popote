/**
 * A tiny, dependency-free Web Push implementation that runs on the Cloudflare
 * Workers runtime (and Node 20+) using only the Web Crypto API (`crypto.subtle`).
 *
 * It implements the two pieces the spec requires:
 *
 *  1. VAPID (RFC 8292): a signed ES256 JWT identifying our application server,
 *     sent in the `Authorization` header so the push service trusts us.
 *  2. Message encryption (RFC 8291, `aes128gcm` content encoding): the payload
 *     is encrypted to the subscription's public key so only the user's browser
 *     can read it.
 *
 * We hand-roll this rather than pull in a Node-only library (the popular
 * `web-push` package depends on Node's `https`/`crypto` and does not run on
 * Workers). Everything here uses standard Web Crypto, which the Void/Cloudflare
 * runtime supports.
 *
 * The functions are intentionally pure (no D1, no env): they take keys/payload
 * in and return request material out, so they are unit-testable in plain Node.
 */

// ── base64url helpers ────────────────────────────────────────────────────────

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// A Uint8Array explicitly backed by a (non-shared) ArrayBuffer. The DOM lib's
// Web Crypto + fetch BodyInit types reject `Uint8Array<ArrayBufferLike>` (which
// could be a SharedArrayBuffer), so every byte buffer we feed to crypto/fetch
// uses this concrete type.
type Bytes = Uint8Array<ArrayBuffer>;

export function base64UrlDecode(input: string): Bytes {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8(input: string): Bytes {
  const encoded = new TextEncoder().encode(input);
  // Copy into a fresh ArrayBuffer-backed view so the type is concrete.
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  return out;
}

function concat(...chunks: Uint8Array[]): Bytes {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

// ── VAPID JWT (RFC 8292) ─────────────────────────────────────────────────────

export interface VapidKeys {
  /** Uncompressed P-256 public key, base64url (65 bytes raw). */
  publicKey: string;
  /** P-256 private scalar `d`, base64url (32 bytes). */
  privateKey: string;
  /** `mailto:` or `https:` contact URL. */
  subject: string;
}

/**
 * Import the VAPID private key (the `d` scalar) as an ECDSA signing key.
 * We reconstruct a full JWK from the private scalar `d` plus the public point
 * (`x`,`y`) derived from the uncompressed public key.
 */
async function importVapidSigningKey(keys: VapidKeys): Promise<CryptoKey> {
  const publicBytes = base64UrlDecode(keys.publicKey);
  // Uncompressed point: 0x04 || X(32) || Y(32)
  if (publicBytes.length !== 65 || publicBytes[0] !== 0x04) {
    throw new Error("VAPID public key must be a 65-byte uncompressed P-256 point");
  }
  const x = base64UrlEncode(publicBytes.slice(1, 33));
  const y = base64UrlEncode(publicBytes.slice(33, 65));

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x,
    y,
    d: keys.privateKey,
    ext: true,
  };

  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

/**
 * Build the signed VAPID JWT for a given push endpoint origin (audience).
 * Exported for unit testing.
 */
export async function createVapidJwt(
  keys: VapidKeys,
  audience: string,
  expirationSeconds = 12 * 60 * 60,
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + expirationSeconds,
    sub: keys.subject,
  };

  const encodedHeader = base64UrlEncode(utf8(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(utf8(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importVapidSigningKey(keys);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    utf8(signingInput),
  );

  // Web Crypto already returns the raw r||s (64-byte) signature ES256 wants.
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

/** The origin (scheme + host) of a push endpoint, used as the JWT audience. */
export function audienceFromEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  return `${url.protocol}//${url.host}`;
}

// ── Payload encryption (RFC 8291, aes128gcm) ─────────────────────────────────

export interface PushSubscriptionKeys {
  /** Client public key from the subscription (`keys.p256dh`), base64url. */
  p256dh: string;
  /** Client auth secret from the subscription (`keys.auth`), base64url. */
  auth: string;
}

async function hkdf(
  salt: Bytes,
  ikm: Bytes,
  info: Bytes,
  length: number,
): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/**
 * Encrypt a UTF-8 payload for a push subscription using the aes128gcm content
 * encoding (RFC 8188 + RFC 8291). Returns the full encrypted body, ready to be
 * sent as the request payload, plus the ephemeral server keys are embedded in
 * the body header per the spec (so no extra headers are needed).
 *
 * `as128gcm` body layout:
 *   salt(16) || rs(4, big-endian) || idlen(1) || keyid(idlen) || ciphertext
 * where keyid is the server's uncompressed public key (65 bytes).
 */
export async function encryptPayload(
  payload: string,
  subscription: PushSubscriptionKeys,
  // Injectable for deterministic tests; defaults to secure random.
  options?: { salt?: Bytes; serverKeys?: CryptoKeyPair },
): Promise<Bytes> {
  const clientPublic = base64UrlDecode(subscription.p256dh);
  const authSecret = base64UrlDecode(subscription.auth);

  const salt = options?.salt ?? crypto.getRandomValues(new Uint8Array(16));

  // Ephemeral server ECDH keypair.
  const serverKeys =
    options?.serverKeys ??
    (await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    ));

  const serverPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey),
  );

  // Import the client public key for ECDH and derive the shared secret.
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverKeys.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Step 1 (RFC 8291 §3.4): derive the IKM from the shared secret keyed by
  // the auth secret, with a key-info string binding both public keys.
  const keyInfo = concat(
    utf8("WebPush: info\0"),
    clientPublic,
    serverPublicRaw,
  );
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // Step 2 (RFC 8188 §2.2): derive the Content-Encryption Key and nonce.
  const cek = await hkdf(
    salt,
    ikm,
    utf8("Content-Encoding: aes128gcm\0"),
    16,
  );
  const nonce = await hkdf(
    salt,
    ikm,
    utf8("Content-Encoding: nonce\0"),
    12,
  );

  // Plaintext is padded with a single 0x02 delimiter (last record).
  const plaintext = concat(utf8(payload), new Uint8Array([0x02]));

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      aesKey,
      plaintext,
    ),
  );

  // Record size: header(21) + ciphertext. We send one record covering the
  // whole payload, so rs just needs to be >= body length.
  const recordSize = 4096;
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, recordSize, false);

  const idlen = new Uint8Array([serverPublicRaw.length]); // 65

  return concat(salt, rs, idlen, serverPublicRaw, ciphertext);
}

// ── High-level send ──────────────────────────────────────────────────────────

export interface WebPushTarget {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface SendResult {
  ok: boolean;
  statusCode: number;
  /** True when the push service says the subscription is gone (404/410). */
  expired: boolean;
  body?: string;
}

/**
 * Build the fetch Request for a single web push, without sending it. Exposed
 * so callers/tests can inspect headers and body. TTL is in seconds.
 */
export async function buildPushRequest(
  vapid: VapidKeys,
  target: WebPushTarget,
  payload: string,
  ttlSeconds = 24 * 60 * 60,
): Promise<Request> {
  const body = await encryptPayload(payload, target.keys);
  const jwt = await createVapidJwt(vapid, audienceFromEndpoint(target.endpoint));

  return new Request(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "normal",
    },
    body,
  });
}

/**
 * Send a single web push notification. Never throws on a push-service error;
 * returns a structured result so callers can prune expired subscriptions.
 */
export async function sendWebPush(
  vapid: VapidKeys,
  target: WebPushTarget,
  payload: string,
  ttlSeconds = 24 * 60 * 60,
): Promise<SendResult> {
  const request = await buildPushRequest(vapid, target, payload, ttlSeconds);
  const response = await fetch(request);
  const ok = response.status >= 200 && response.status < 300;
  const expired = response.status === 404 || response.status === 410;
  let bodyText: string | undefined;
  if (!ok) {
    try {
      bodyText = await response.text();
    } catch {
      bodyText = undefined;
    }
  }
  return { ok, statusCode: response.status, expired, body: bodyText };
}
