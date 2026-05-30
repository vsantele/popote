/**
 * Browser-side helpers for Web Push opt-in. Kept framework-agnostic so the
 * pure bits (the VAPID key decoder) are unit-testable in jsdom/node.
 */

/** Is the Push API usable in this browser/context? */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Convert a base64url VAPID public key into the Uint8Array that
 * `PushManager.subscribe({ applicationServerKey })` expects. Pure + tested.
 */
export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/** Serialise a PushSubscription into the shape our API expects. */
export function serializeSubscription(sub: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
    },
  };
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // The root layout registers `/service-worker.js`; wait until it's ready.
  return navigator.serviceWorker.ready;
}

/**
 * Current subscription for this device, if any. Best-effort: we don't block on
 * `serviceWorker.ready` (which can hang if the SW hasn't registered yet) — if
 * no registration is available promptly we report "no subscription" and let the
 * user opt in, which awaits readiness properly under a user gesture.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Prompt for permission (must be called from a user gesture) and subscribe.
 * Persists the subscription via the API. Returns the subscription or throws.
 */
export async function subscribeToPush(params: {
  vapidPublicKey: string;
  eventId?: number | null;
}): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("Push not supported");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission denied");
  }

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(params.vapidPublicKey),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: serializeSubscription(sub),
      eventId: params.eventId ?? null,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to store subscription (${res.status})`);
  }

  return sub;
}

/** Unsubscribe this device and tell the server to forget it. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {
    /* even if the browser unsubscribe fails, still drop it server-side */
  });

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}
