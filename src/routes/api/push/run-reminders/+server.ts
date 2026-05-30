import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { runDueReminders } from "$lib/server/push/reminders";
import type { VapidKeys } from "$lib/server/push/web-push";
import { log } from "$lib/utils/logger";

/**
 * Manually trigger the T-24h reminder run. This is the same logic the cron
 * fires, exposed as an endpoint so it can be tested locally (where cron
 * triggers don't fire) or wired to an external scheduler if needed.
 *
 * Guarded by a shared secret: callers must send `Authorization: Bearer
 * <PUSH_CRON_SECRET>`. In dev (no secret set) the guard is relaxed to allow
 * local testing.
 */
export const POST: RequestHandler = async ({ request }) => {
  const secret = env.PUSH_CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      throw error(401, "Unauthorized");
    }
  }

  const vapid: Partial<VapidKeys> = {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  };

  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    throw error(503, "Web push is not configured (missing VAPID keys)");
  }

  // Optional override of "now" for testing the selection window.
  let nowMs: number | undefined;
  try {
    const body = (await request.json()) as { nowMs?: number } | null;
    if (typeof body?.nowMs === "number") nowMs = body.nowMs;
  } catch {
    // no body — use real now
  }

  const result = await runDueReminders(vapid as VapidKeys, nowMs);
  log("info", "Manual reminder run", { ...result });
  return json(result);
};
