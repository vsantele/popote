/**
 * Storage layer for Web Push subscriptions. Idempotent by design: a device is
 * identified by its push `endpoint` (globally unique), so re-subscribing the
 * same device updates the existing row instead of creating duplicates. Opt-out
 * deletes the row entirely so the cron never targets it again.
 */
import { db, eq, and } from "void/db";
import { pushSubscriptions } from "@schema";

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type SaveResult = { ok: true; created: boolean } | { ok: false };

/**
 * Idempotently store a subscription for a user (optionally scoped to an event).
 * If the endpoint already exists we refresh its keys/owner/scope; otherwise we
 * insert. Returns whether a new row was created.
 */
export async function saveSubscription(params: {
  userId: string;
  subscription: BrowserSubscription;
  eventId?: number | null;
}): Promise<SaveResult> {
  const { userId, subscription, eventId = null } = params;

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { ok: false };
  }

  const [existing] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
    .limit(1);

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        eventId,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscriptions.id, existing.id));
    return { ok: true, created: false };
  }

  await db.insert(pushSubscriptions).values({
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userId,
    eventId,
  });
  return { ok: true, created: true };
}

/**
 * Remove a subscription by endpoint. Idempotent: deleting a non-existent
 * endpoint is a no-op success. We additionally scope by userId so a user can
 * only ever delete their own device subscription.
 */
export async function deleteSubscription(params: {
  userId: string;
  endpoint: string;
}): Promise<{ ok: true }> {
  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, params.endpoint),
        eq(pushSubscriptions.userId, params.userId),
      ),
    );
  return { ok: true };
}

/** Remove a subscription by endpoint regardless of owner (for pruning expired
 * endpoints reported by the push service during a send). */
export async function deleteSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
}

/** Has this user already opted in on this device (endpoint)? */
export async function getSubscriptionByEndpoint(endpoint: string) {
  const [row] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);
  return row ?? null;
}
