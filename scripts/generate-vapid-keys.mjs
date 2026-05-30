#!/usr/bin/env node
// Generate a VAPID (Voluntary Application Server Identification) keypair for
// Web Push, using the Web Crypto API — the exact same primitive the Worker
// uses at runtime, so the key formats match.
//
//   node scripts/generate-vapid-keys.mjs
//
// Prints:
//   - VAPID_PUBLIC_KEY  : the uncompressed P-256 public key as base64url (65B)
//                          -> put in void.json worker.vars (NOT secret)
//   - VAPID_PRIVATE_KEY : the P-256 private scalar `d` as base64url (32B)
//                          -> put in .env.local locally; `void secret put` in prod
//
// These are NOT committed by this script — paste them yourself.
import { webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const kp = await subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);

const rawPublic = await subtle.exportKey("raw", kp.publicKey);
const jwk = await subtle.exportKey("jwk", kp.privateKey);

console.log("VAPID_PUBLIC_KEY=" + b64url(rawPublic));
console.log("VAPID_PRIVATE_KEY=" + jwk.d);
console.log("VAPID_SUBJECT=mailto:you@example.com");
