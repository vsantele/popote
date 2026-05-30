import { describe, it, expect } from "vite-plus/test";
import {
  urlBase64ToUint8Array,
  serializeSubscription,
} from "../../src/lib/push/client";

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url VAPID key to the expected 65-byte length", () => {
    const key =
      "BH6Tmwx1kk8oxBPRwk-TRzYjqNjeIPqKJcyTE4w-moDSrm1enr5acJcA8weap7CbDbsdmsi2eABKBNAGssgst1Q";
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    // Uncompressed EC point marker.
    expect(bytes[0]).toBe(0x04);
  });

  it("handles url-safe chars (- and _) and missing padding", () => {
    // "-_" must map to "+/" and decode without throwing.
    expect(() => urlBase64ToUint8Array("-_-_")).not.toThrow();
  });
});

describe("serializeSubscription", () => {
  it("flattens a PushSubscription into endpoint + keys", () => {
    const fake = {
      endpoint: "https://push.example.com/x",
      toJSON: () => ({
        endpoint: "https://push.example.com/x",
        keys: { p256dh: "PUB", auth: "AUTH" },
      }),
    } as unknown as PushSubscription;

    expect(serializeSubscription(fake)).toEqual({
      endpoint: "https://push.example.com/x",
      keys: { p256dh: "PUB", auth: "AUTH" },
    });
  });
});
