import { describe, it, expect } from "vite-plus/test";
import { webcrypto } from "node:crypto";
import {
  base64UrlEncode,
  base64UrlDecode,
  createVapidJwt,
  audienceFromEndpoint,
  encryptPayload,
  buildPushRequest,
  type VapidKeys,
} from "../../src/lib/server/push/web-push";

// A real dev VAPID keypair (public + private scalar). Not a secret in tests.
const VAPID: VapidKeys = {
  publicKey:
    "BH6Tmwx1kk8oxBPRwk-TRzYjqNjeIPqKJcyTE4w-moDSrm1enr5acJcA8weap7CbDbsdmsi2eABKBNAGssgst1Q",
  privateKey: "084Ccy5gzAPm4_3M3woDvgQSPRdvXraOi7w7g52jk2k",
  subject: "mailto:test@example.com",
};

describe("base64url", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128, 64]);
    const decoded = base64UrlDecode(base64UrlEncode(bytes));
    expect([...decoded]).toEqual([...bytes]);
  });

  it("produces url-safe output with no padding", () => {
    const encoded = base64UrlEncode(new Uint8Array([251, 255, 191]));
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe("audienceFromEndpoint", () => {
  it("strips the path and query, keeping scheme + host", () => {
    expect(
      audienceFromEndpoint("https://fcm.googleapis.com/fcm/send/abc?x=1"),
    ).toBe("https://fcm.googleapis.com");
  });
});

describe("createVapidJwt", () => {
  it("creates a 3-part ES256 JWT that verifies against the public key", async () => {
    const jwt = await createVapidJwt(VAPID, "https://push.example.com");
    const [header, payload, signature] = jwt.split(".");
    expect(header && payload && signature).toBeTruthy();

    // Header is { typ: "JWT", alg: "ES256" }
    const decodedHeader = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(header)),
    );
    expect(decodedHeader.alg).toBe("ES256");

    // Payload carries aud/exp/sub.
    const decodedPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payload)),
    );
    expect(decodedPayload.aud).toBe("https://push.example.com");
    expect(decodedPayload.sub).toBe("mailto:test@example.com");
    expect(typeof decodedPayload.exp).toBe("number");

    // Signature verifies with the corresponding public key.
    const pub = base64UrlDecode(VAPID.publicKey);
    const x = base64UrlEncode(pub.slice(1, 33));
    const y = base64UrlEncode(pub.slice(33, 65));
    const verifyKey = await webcrypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", x, y, ext: true },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const valid = await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      verifyKey,
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(valid).toBe(true);
  });
});

describe("encryptPayload (RFC 8291 aes128gcm)", () => {
  it("produces a body the client can decrypt back to the plaintext", async () => {
    // Generate a client subscription keypair + auth secret.
    const clientKp = await webcrypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    const clientPubRaw = new Uint8Array(
      await webcrypto.subtle.exportKey("raw", clientKp.publicKey),
    );
    const authSecret = webcrypto.getRandomValues(new Uint8Array(16));

    const body = await encryptPayload("La Popote: BBQ demain !", {
      p256dh: base64UrlEncode(clientPubRaw),
      auth: base64UrlEncode(authSecret),
    });

    // Header: salt(16) || rs(4) || idlen(1==65) || serverPub(65) || ciphertext
    expect(body[20]).toBe(65);
    const salt = body.slice(0, 16);
    const serverPubRaw = body.slice(21, 86);
    const cipher = body.slice(86);

    // Mimic the browser's decryption to prove correctness.
    const concat = (...c: Uint8Array[]) => {
      const total = c.reduce((n, a) => n + a.length, 0);
      const o = new Uint8Array(total);
      let off = 0;
      for (const a of c) {
        o.set(a, off);
        off += a.length;
      }
      return o;
    };
    const hkdf = async (
      s: Uint8Array<ArrayBuffer>,
      ikm: Uint8Array<ArrayBuffer>,
      info: Uint8Array<ArrayBuffer>,
      len: number,
    ) => {
      const k = await webcrypto.subtle.importKey("raw", ikm, "HKDF", false, [
        "deriveBits",
      ]);
      return new Uint8Array(
        await webcrypto.subtle.deriveBits(
          { name: "HKDF", hash: "SHA-256", salt: s, info },
          k,
          len * 8,
        ),
      );
    };
    const ut8 = (z: string): Uint8Array<ArrayBuffer> => {
      const e = new TextEncoder().encode(z);
      const o = new Uint8Array(e.length);
      o.set(e);
      return o;
    };

    const serverKey = await webcrypto.subtle.importKey(
      "raw",
      serverPubRaw,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
    const shared = new Uint8Array(
      await webcrypto.subtle.deriveBits(
        { name: "ECDH", public: serverKey },
        clientKp.privateKey,
        256,
      ),
    );
    const ikm = await hkdf(
      authSecret,
      shared,
      concat(ut8("WebPush: info\0"), clientPubRaw, serverPubRaw),
      32,
    );
    const cek = await hkdf(salt, ikm, ut8("Content-Encoding: aes128gcm\0"), 16);
    const nonce = await hkdf(salt, ikm, ut8("Content-Encoding: nonce\0"), 12);
    const aesKey = await webcrypto.subtle.importKey(
      "raw",
      cek,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    const plain = new Uint8Array(
      await webcrypto.subtle.decrypt(
        { name: "AES-GCM", iv: nonce, tagLength: 128 },
        aesKey,
        cipher,
      ),
    );
    // Strip the single 0x02 padding delimiter.
    expect(plain[plain.length - 1]).toBe(0x02);
    const text = new TextDecoder().decode(plain.slice(0, plain.length - 1));
    expect(text).toBe("La Popote: BBQ demain !");
  });
});

describe("buildPushRequest", () => {
  it("sets the VAPID auth, content-encoding and TTL headers", async () => {
    const clientKp = await webcrypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    const clientPubRaw = new Uint8Array(
      await webcrypto.subtle.exportKey("raw", clientKp.publicKey),
    );
    const authSecret = webcrypto.getRandomValues(new Uint8Array(16));

    const req = await buildPushRequest(
      VAPID,
      {
        endpoint: "https://push.example.com/sub/123",
        keys: {
          p256dh: base64UrlEncode(clientPubRaw),
          auth: base64UrlEncode(authSecret),
        },
      },
      "payload",
      3600,
    );

    expect(req.method).toBe("POST");
    expect(req.headers.get("content-encoding")).toBe("aes128gcm");
    expect(req.headers.get("ttl")).toBe("3600");
    const auth = req.headers.get("authorization");
    expect(auth).toMatch(/^vapid t=.+, k=/);
    expect(auth).toContain(VAPID.publicKey);
  });
});
