/**
 * T-24h reminder logic. Split into a PURE selector (which events are "due" at a
 * given instant) — trivially unit-testable — and a DB/push-backed runner used
 * by the cron job and the manual trigger endpoint.
 */
import { db, eq, and, gte, lte, isNull, or } from "void/db";
import { events, participants, pushSubscriptions, sentReminders } from "@schema";
import {
  sendWebPush,
  type VapidKeys,
  type WebPushTarget,
} from "./web-push";
import { deleteSubscriptionByEndpoint } from "./subscriptions";

export interface ReminderWindow {
  /** Inclusive lower bound on event start, ms epoch. */
  fromMs: number;
  /** Inclusive upper bound on event start, ms epoch. */
  toMs: number;
}

/**
 * Given the current time, return the [from, to] window of event start times
 * that are "~T-24h away". We use a window (not an exact instant) because the
 * cron fires on an interval: anything starting between 23h and 25h from now is
 * considered due. The `sent_reminders` table guarantees we never double-send,
 * so a slightly wide window is safe.
 */
export function reminderWindow(
  nowMs: number,
  opts: { aheadHours?: number; toleranceHours?: number } = {},
): ReminderWindow {
  const aheadHours = opts.aheadHours ?? 24;
  const toleranceHours = opts.toleranceHours ?? 1;
  const center = nowMs + aheadHours * 60 * 60 * 1000;
  const tol = toleranceHours * 60 * 60 * 1000;
  return { fromMs: center - tol, toMs: center + tol };
}

/**
 * Pure predicate: is an event with this start time due for a T-24h reminder at
 * `nowMs`? Exposed for unit tests and reused by the DB query bounds.
 */
export function isEventDue(
  eventStartMs: number,
  nowMs: number,
  opts?: { aheadHours?: number; toleranceHours?: number },
): boolean {
  const { fromMs, toMs } = reminderWindow(nowMs, opts);
  return eventStartMs >= fromMs && eventStartMs <= toMs;
}

/** What the reminder notification says. Pure + i18n-agnostic (server-side). */
export function buildReminderPayload(event: {
  name: string;
  shareCode: string;
  dateMs: number;
}): string {
  return JSON.stringify({
    title: "🍽️ La Popote",
    body: `« ${event.name} » c'est bientôt — vérifie ce que tu apportes !`,
    url: `/e/${event.shareCode}`,
    tag: `event-reminder-${event.shareCode}`,
  });
}

export interface RunRemindersResult {
  dueEvents: number;
  notificationsSent: number;
  failures: number;
  pruned: number;
  skippedAlreadySent: number;
}

/**
 * Find events due for a T-24h reminder, and push to every opted-in device of
 * each participant — once. Idempotency is enforced by the `sent_reminders`
 * table (UNIQUE on event+subscription+kind): we record a send before/at the
 * time we send, and skip any (event, subscription) already recorded.
 */
export async function runDueReminders(
  vapid: VapidKeys,
  nowMs: number = Date.now(),
): Promise<RunRemindersResult> {
  const { fromMs, toMs } = reminderWindow(nowMs);

  const dueEvents = await db
    .select({
      id: events.id,
      name: events.name,
      shareCode: events.shareCode,
      date: events.date,
    })
    .from(events)
    .where(
      and(
        gte(events.date, new Date(fromMs)),
        lte(events.date, new Date(toMs)),
      ),
    );

  const result: RunRemindersResult = {
    dueEvents: dueEvents.length,
    notificationsSent: 0,
    failures: 0,
    pruned: 0,
    skippedAlreadySent: 0,
  };

  for (const event of dueEvents) {
    // Every subscription owned by a participant of this event, OR explicitly
    // scoped to this event. Account-wide subs (eventId null) of participants
    // count too.
    const subs = await db
      .select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
      })
      .from(pushSubscriptions)
      .innerJoin(
        participants,
        eq(participants.userId, pushSubscriptions.userId),
      )
      .where(
        and(
          eq(participants.eventId, event.id),
          // Only "going"/"maybe" participants get a reminder; declined opt out.
          or(eq(participants.rsvp, "going"), eq(participants.rsvp, "maybe")),
          or(
            isNull(pushSubscriptions.eventId),
            eq(pushSubscriptions.eventId, event.id),
          ),
        ),
      );

    // De-dupe subscriptions (a user could match via multiple participant rows).
    const uniqueSubs = new Map<number, (typeof subs)[number]>();
    for (const s of subs) uniqueSubs.set(s.id, s);

    const payload = buildReminderPayload({
      name: event.name,
      shareCode: event.shareCode,
      dateMs: new Date(event.date).getTime(),
    });

    for (const sub of uniqueSubs.values()) {
      // Idempotency guard: have we already reminded this device for this event?
      const [already] = await db
        .select({ id: sentReminders.id })
        .from(sentReminders)
        .where(
          and(
            eq(sentReminders.eventId, event.id),
            eq(sentReminders.subscriptionId, sub.id),
            eq(sentReminders.kind, "t24h"),
          ),
        )
        .limit(1);

      if (already) {
        result.skippedAlreadySent++;
        continue;
      }

      const target: WebPushTarget = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        const send = await sendWebPush(vapid, target, payload);

        if (send.ok) {
          result.notificationsSent++;
          // Record the send so a later run never repeats it.
          await db
            .insert(sentReminders)
            .values({
              eventId: event.id,
              subscriptionId: sub.id,
              kind: "t24h",
            })
            .onConflictDoNothing();
        } else if (send.expired) {
          // 404/410: the subscription is dead — prune it so we stop trying.
          await deleteSubscriptionByEndpoint(sub.endpoint);
          result.pruned++;
        } else {
          result.failures++;
        }
      } catch {
        // A single malformed/unsendable subscription (e.g. corrupt keys) must
        // never abort the whole run — count it and move on.
        result.failures++;
      }
    }
  }

  return result;
}
