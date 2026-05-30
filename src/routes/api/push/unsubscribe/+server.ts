import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { deleteSubscription } from "$lib/server/push/subscriptions";
import { log } from "$lib/utils/logger";

/**
 * Opt-out: remove the caller's subscription by endpoint. Idempotent — removing
 * an unknown endpoint still returns ok. Scoped to the authenticated user so a
 * user can only delete their own device.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    throw error(401, "Not authenticated");
  }

  let payload: { endpoint?: string };
  try {
    payload = await request.json();
  } catch {
    throw error(400, "Invalid JSON body");
  }

  if (!payload?.endpoint) {
    throw error(400, "Missing endpoint");
  }

  await deleteSubscription({ userId: locals.user.id, endpoint: payload.endpoint });
  log("info", "Removed push subscription", { userId: locals.user.id });

  return json({ ok: true });
};
