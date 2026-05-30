/**
 * T-24h event reminder cron.
 *
 * Void discovers `crons/**.ts`, registers the schedule as a Cloudflare Worker
 * cron trigger at deploy time, and routes the scheduled invocation here. Cron
 * triggers do NOT fire on their own during local dev (a miniflare limitation):
 * exercise this locally by POSTing to `/__void/scheduled` with the dev token
 * Void prints at startup, or hit the `/api/push/run-reminders` endpoint.
 *
 * Runs hourly; the reminder window is ±1h around T-24h and the `sent_reminders`
 * table makes repeated runs idempotent, so the exact firing minute is not
 * load-bearing.
 */
import { defineScheduled } from "void";
import { runDueReminders } from "$lib/server/push/reminders";
import type { VapidKeys } from "$lib/server/push/web-push";

export const cron = "0 * * * *"; // every hour, on the hour

export default defineScheduled(async (controller, env) => {
  const e = env as Record<string, string | undefined>;

  const vapid: Partial<VapidKeys> = {
    publicKey: e.VAPID_PUBLIC_KEY,
    privateKey: e.VAPID_PRIVATE_KEY,
    subject: e.VAPID_SUBJECT,
  };

  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    console.warn(
      "[event-reminders] VAPID keys not configured; skipping reminder run",
    );
    return { ok: false, reason: "vapid-not-configured" };
  }

  const result = await runDueReminders(
    vapid as VapidKeys,
    controller.scheduledTime,
  );
  console.log("[event-reminders] run complete", result);
  return { ok: true, ...result };
});
