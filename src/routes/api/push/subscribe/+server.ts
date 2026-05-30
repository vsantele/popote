import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { saveSubscription } from "$lib/server/push/subscriptions";
import { log } from "$lib/utils/logger";

/**
 * Opt-in: store (idempotently) the caller's browser push subscription. The
 * subscription is tied to the authenticated user (every visitor has at least
 * an anonymous session). Optionally scoped to an event via `eventId`.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Not authenticated");
  }

  let payload: {
    subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    eventId?: number | null;
  };
  try {
    payload = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }

  if (!payload?.subscription) {
    throw error(400, "Missing subscription");
  }

  const result = await saveSubscription({
    userId: locals.user.id,
    subscription: payload.subscription,
    eventId: payload.eventId ?? null,
  });

  if (!result.ok) {
    throw error(400, "Invalid subscription");
  }

  log("info", "Stored push subscription", {
    userId: locals.user.id,
    created: result.created,
  });

  return json({ ok: true, created: result.created });
};
