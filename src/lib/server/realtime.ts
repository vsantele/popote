/**
 * Server-side change detection for the live event board.
 *
 * ## Why a version probe instead of a Durable Object
 *
 * The void platform does not expose Durable-Object fanout to SvelteKit
 * (meta-framework) apps — `void/live` and `void/ws` are "Void apps only" and
 * the build throws if imported here. So a mutating request in one Worker
 * invocation cannot directly "push" to an SSE stream living in another
 * invocation.
 *
 * Instead, the SSE endpoint cheaply polls this `eventVersion()` probe on a
 * short interval and emits a `change` event the moment the version moves. The
 * version is derived from row counts + the latest `updatedAt`/`createdAt`
 * across the event's participants and items, so any add / edit / remove / join
 * changes it. This is two indexed `SELECT`s against D1 — far cheaper than
 * re-sending the whole board, and it only runs while at least one viewer holds
 * a live connection.
 *
 * ## Import pattern
 *
 * `db`, `eq`, and `sql` are imported from `void/db` (not `drizzle-orm`
 * directly) so that the Void Vite plugin's virtual module — which wires the
 * D1 binding and the user schema into the Drizzle instance — is used in both
 * dev and production. Schemas come from `@schema` (the canonical Void alias)
 * rather than the re-export barrel at `$lib/server/db/schema`, following the
 * same pattern as the rest of the data layer (`db/index.ts`, `auth.ts`, …).
 * Mixing import sources can result in `db` receiving column references from a
 * different module instance than it was initialised with, which causes silent
 * query mismatches or runtime errors in the Workers build.
 */
import { db, eq, sql } from "void/db";
import { events, participants, items, eventSlots } from "@schema";

export interface EventVersion {
  /** Resolved internal event id, or null when the event does not exist. */
  eventId: number | null;
  /** Opaque token that changes whenever the board's data changes. */
  token: string;
}

/**
 * Compute an opaque version token for an event identified by its share code.
 * Two calls return the same token iff the participants and items are unchanged.
 */
export async function eventVersion(shareCode: string): Promise<EventVersion> {
  const code = shareCode.toUpperCase();

  const [event] = await db
    .select({ id: events.id, updatedAt: events.updatedAt })
    .from(events)
    .where(eq(events.shareCode, code))
    .limit(1);

  if (!event) {
    return { eventId: null, token: "missing" };
  }

  const [pAgg] = await db
    .select({
      count: sql<number>`count(*)`,
      maxCreated: sql<number>`coalesce(max(${participants.createdAt}), 0)`,
      maxUpdated: sql<number>`coalesce(max(${participants.updatedAt}), 0)`,
    })
    .from(participants)
    .where(eq(participants.eventId, event.id));

  const [iAgg] = await db
    .select({
      count: sql<number>`count(*)`,
      maxCreated: sql<number>`coalesce(max(${items.createdAt}), 0)`,
      maxUpdated: sql<number>`coalesce(max(${items.updatedAt}), 0)`,
    })
    .from(items)
    .where(eq(items.eventId, event.id));

  // Host slot changes (issue #5) must propagate live too. Claims already move
  // the items aggregate above (claiming creates an item); this catches the
  // host adding / editing / removing the slots themselves.
  const [sAgg] = await db
    .select({
      count: sql<number>`count(*)`,
      maxCreated: sql<number>`coalesce(max(${eventSlots.createdAt}), 0)`,
      maxUpdated: sql<number>`coalesce(max(${eventSlots.updatedAt}), 0)`,
    })
    .from(eventSlots)
    .where(eq(eventSlots.eventId, event.id));

  // Counts catch deletes (a delete lowers count even if max timestamps are
  // stale); max timestamps catch inserts and in-place edits.
  const token = [
    pAgg?.count ?? 0,
    pAgg?.maxCreated ?? 0,
    pAgg?.maxUpdated ?? 0,
    iAgg?.count ?? 0,
    iAgg?.maxCreated ?? 0,
    iAgg?.maxUpdated ?? 0,
    sAgg?.count ?? 0,
    sAgg?.maxCreated ?? 0,
    sAgg?.maxUpdated ?? 0,
    Number(event.updatedAt instanceof Date ? event.updatedAt.getTime() : 0),
  ].join(":");

  return { eventId: event.id, token };
}
