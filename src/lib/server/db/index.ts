import { events, participants, items, eventSlots } from "@schema";
import { generateUniqueShareCode } from "./utils";
import { db, eq, and, desc, sql } from "void/db";
import { VALID_DIETARY_TAGS } from "$lib/types/index";
import type { DietaryTag } from "$lib/types/index";

/** Parse a JSON string of dietary tag keys, dropping any unrecognised values. */
function parseTagsJson(raw: string | null | undefined): DietaryTag[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is DietaryTag =>
      (VALID_DIETARY_TAGS as readonly string[]).includes(t),
    );
  } catch {
    return [];
  }
}

export type Database = NonNullable<typeof db>;

export async function getEventByShareCode(shareCode: string) {
  // Core query builder (db.select) instead of the relational API
  // (db.query.*): Void only injects the schema into `db` via its Vite
  // virtual module, which is not applied to server modules in local dev,
  // so db.query.* is undefined there. db.select works in dev and prod.
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.shareCode, shareCode.toUpperCase()))
    .limit(1);

  if (!event) return undefined;

  const eventParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, event.id));

  const itemRows = await db
    .select({ item: items, participant: participants })
    .from(items)
    .leftJoin(participants, eq(items.participantId, participants.id))
    .where(eq(items.eventId, event.id));

  return {
    ...event,
    participants: eventParticipants,
    items: itemRows.map((r) => ({
      ...r.item,
      dietaryTags: parseTagsJson(r.item.dietaryTags),
      participant: r.participant,
    })),
  };
}

export async function createEventWithHost(eventData: {
  name: string;
  date: Date;
  location?: string;
  description?: string;
  hostName: string;
  hostUserId: string;
}) {
  const shareCode = await generateUniqueShareCode();

  const [newEvent] = await db
    .insert(events)
    .values({
      name: eventData.name,
      date: eventData.date,
      location: eventData.location || null,
      description: eventData.description || null,
      hostName: eventData.hostName,
      hostUserId: eventData.hostUserId,
      shareCode,
    })
    .returning();

  const [hostParticipant] = await db
    .insert(participants)
    .values({
      eventId: newEvent.id,
      name: eventData.hostName,
      userId: eventData.hostUserId,
      isHost: true,
    })
    .returning();

  const result = { event: newEvent, participant: hostParticipant };

  return {
    share_code: result.event.shareCode,
    ...result.event,
  };
}

export async function getParticipantsByEventId(eventId: number) {
  return await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, eventId));
}

export async function getItemsByEventId(eventId: number) {
  const rows = await db
    .select({ item: items, participant: participants })
    .from(items)
    .leftJoin(participants, eq(items.participantId, participants.id))
    .where(eq(items.eventId, eventId));

  return rows.map((r) => ({
    ...r.item,
    dietaryTags: parseTagsJson(r.item.dietaryTags),
    participant: r.participant,
  }));
}

export async function findOrCreateParticipant(
  eventId: number,
  userId: string,
  name: string,
) {
  const [existing] = await db
    .select()
    .from(participants)
    .where(
      and(eq(participants.eventId, eventId), eq(participants.userId, userId)),
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [newParticipant] = await db
    .insert(participants)
    .values({
      eventId,
      name,
      userId,
      isHost: false,
    })
    .returning();

  return newParticipant;
}

export async function createItemForParticipant(itemData: {
  eventId: number;
  participantId: number;
  name: string;
  category: string;
  quantity?: string;
  dietaryTags?: string[];
}) {
  const [newItem] = await db
    .insert(items)
    .values({
      eventId: itemData.eventId,
      participantId: itemData.participantId,
      name: itemData.name,
      category: itemData.category,
      quantity: itemData.quantity || null,
      dietaryTags: JSON.stringify(itemData.dietaryTags ?? []),
    })
    .returning();

  return newItem;
}

export type ItemMutationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" };

/**
 * Look up an item joined with its participant and event so we can decide,
 * server-side, whether `userId` is allowed to mutate it.
 *
 * Ownership rule (re-derived here, never trusted from the client):
 *  - the participant who added the item (participant.userId === userId), OR
 *  - the event host (event.hostUserId === userId)
 * may modify it.
 */
async function authorizeItemMutation(itemId: number, userId: string) {
  const [row] = await db
    .select({ item: items, participant: participants, event: events })
    .from(items)
    .leftJoin(participants, eq(items.participantId, participants.id))
    .leftJoin(events, eq(items.eventId, events.id))
    .where(eq(items.id, itemId))
    .limit(1);

  if (!row || !row.item) {
    return { authorized: false as const, reason: "not_found" as const };
  }

  const isOwner = row.participant?.userId === userId;
  const isHost = row.event?.hostUserId === userId;

  if (!isOwner && !isHost) {
    return { authorized: false as const, reason: "forbidden" as const };
  }

  return { authorized: true as const };
}

/**
 * Update an item's editable fields, but ONLY if `userId` owns it or hosts the
 * event. Ownership is enforced at this data layer so it cannot be bypassed by
 * a crafted request.
 */
export async function updateItem(params: {
  itemId: number;
  userId: string;
  data: { name: string; category: string; quantity?: string; dietaryTags?: string[] };
}): Promise<ItemMutationResult> {
  const auth = await authorizeItemMutation(params.itemId, params.userId);
  if (!auth.authorized) {
    return { ok: false, reason: auth.reason };
  }

  await db
    .update(items)
    .set({
      name: params.data.name,
      category: params.data.category,
      quantity: params.data.quantity || null,
      dietaryTags: JSON.stringify(params.data.dietaryTags ?? []),
    })
    .where(eq(items.id, params.itemId));

  return { ok: true };
}

/**
 * Delete an item, but ONLY if `userId` owns it or hosts the event. Ownership
 * is enforced at this data layer so it cannot be bypassed by a crafted
 * request.
 */
export async function deleteItem(params: {
  itemId: number;
  userId: string;
}): Promise<ItemMutationResult> {
  const auth = await authorizeItemMutation(params.itemId, params.userId);
  if (!auth.authorized) {
    return { ok: false, reason: auth.reason };
  }

  await db.delete(items).where(eq(items.id, params.itemId));

  return { ok: true };
}

export type RsvpMutationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" };

/**
 * Update a participant's OWN RSVP status and +1 count.
 *
 * Ownership rule (re-derived here, never trusted from the client): a user may
 * only change the participant row whose `userId` matches their own. Unlike
 * item edits, the host has NO override here — an RSVP is personal, so even the
 * host can only set their own attendance (they manage their own participant
 * row, which is exactly this path). This is enforced at the data layer so it
 * cannot be bypassed by a crafted request targeting another participant's id.
 */
export async function updateRsvp(params: {
  participantId: number;
  userId: string;
  data: { rsvp: "going" | "maybe" | "not"; extraGuests: number };
}): Promise<RsvpMutationResult> {
  const [row] = await db
    .select({ id: participants.id, userId: participants.userId })
    .from(participants)
    .where(eq(participants.id, params.participantId))
    .limit(1);

  if (!row) {
    return { ok: false, reason: "not_found" };
  }

  // Only the participant themselves may change their RSVP.
  if (row.userId !== params.userId) {
    return { ok: false, reason: "forbidden" };
  }

  const extraGuests = Math.max(
    0,
    Math.trunc(Number(params.data.extraGuests) || 0),
  );

  await db
    .update(participants)
    .set({
      rsvp: params.data.rsvp,
      extraGuests,
      // Bump updatedAt so the realtime version probe (which hashes
      // participants.updatedAt) sees the change and pushes it live.
      updatedAt: new Date(),
    })
    .where(eq(participants.id, params.participantId));

  return { ok: true };
}

// ── Host wishlist / needed slots (issue #5) ──────────────────────────────
//
// The host defines "needed slots" (label + count, optional category). Guests
// claim an open slot, which creates an item owned by that guest and linked to
// the slot. A slot's open count = neededCount − (items linked to that slot).

export type SlotWithOpenCount = {
  id: number;
  eventId: number;
  label: string;
  category: string | null;
  neededCount: number;
  claimedCount: number;
  openCount: number;
};

/**
 * List an event's slots together with how many of each are already claimed
 * (i.e. how many items link to them) and how many remain open. One grouped
 * LEFT JOIN keeps this to a single query.
 */
export async function getSlotsByEventId(
  eventId: number,
): Promise<SlotWithOpenCount[]> {
  const rows = await db
    .select({
      id: eventSlots.id,
      eventId: eventSlots.eventId,
      label: eventSlots.label,
      category: eventSlots.category,
      neededCount: eventSlots.neededCount,
      // count(items.id) ignores the NULL produced by a slot with no claims.
      claimedCount: sql<number>`count(${items.id})`,
    })
    .from(eventSlots)
    .leftJoin(items, eq(items.slotId, eventSlots.id))
    .where(eq(eventSlots.eventId, eventId))
    .groupBy(eventSlots.id)
    .orderBy(eventSlots.id);

  return rows.map((r) => {
    const claimed = Number(r.claimedCount ?? 0);
    return {
      id: r.id,
      eventId: r.eventId,
      label: r.label,
      category: r.category,
      neededCount: r.neededCount,
      claimedCount: claimed,
      openCount: Math.max(0, r.neededCount - claimed),
    };
  });
}

export type SlotMutationResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid" };

/**
 * Re-derive, server-side, whether `userId` hosts the event the slot belongs to.
 * Only the host may create/edit/delete slots — never trusted from the client.
 */
async function authorizeSlotMutation(slotId: number, userId: string) {
  const [row] = await db
    .select({ slot: eventSlots, event: events })
    .from(eventSlots)
    .leftJoin(events, eq(eventSlots.eventId, events.id))
    .where(eq(eventSlots.id, slotId))
    .limit(1);

  if (!row || !row.slot) {
    return { authorized: false as const, reason: "not_found" as const };
  }

  if (row.event?.hostUserId !== userId) {
    return { authorized: false as const, reason: "forbidden" as const };
  }

  return { authorized: true as const, slot: row.slot };
}

/** Clamp a needed-count request into a sane [1, 99] integer range. */
function normalizeNeededCount(raw: number): number {
  return Math.min(99, Math.max(1, Math.trunc(Number(raw) || 1)));
}

/**
 * Create a slot for an event, but ONLY if `userId` is that event's host.
 * Host ownership is re-derived from (event, hostUserId) at this data layer so
 * it cannot be bypassed by a crafted request.
 */
export async function createSlot(params: {
  eventId: number;
  userId: string;
  data: { label: string; category: string | null; neededCount: number };
}): Promise<SlotMutationResult> {
  const [event] = await db
    .select({ id: events.id, hostUserId: events.hostUserId })
    .from(events)
    .where(eq(events.id, params.eventId))
    .limit(1);

  if (!event) {
    return { ok: false, reason: "not_found" };
  }
  if (event.hostUserId !== params.userId) {
    return { ok: false, reason: "forbidden" };
  }

  const label = params.data.label.trim();
  if (!label) {
    return { ok: false, reason: "invalid" };
  }

  await db.insert(eventSlots).values({
    eventId: params.eventId,
    label,
    category: params.data.category || null,
    neededCount: normalizeNeededCount(params.data.neededCount),
  });

  return { ok: true };
}

/**
 * Edit a slot's label / category / needed count, host-only.
 */
export async function updateSlot(params: {
  slotId: number;
  userId: string;
  data: { label: string; category: string | null; neededCount: number };
}): Promise<SlotMutationResult> {
  const auth = await authorizeSlotMutation(params.slotId, params.userId);
  if (!auth.authorized) {
    return { ok: false, reason: auth.reason };
  }

  const label = params.data.label.trim();
  if (!label) {
    return { ok: false, reason: "invalid" };
  }

  await db
    .update(eventSlots)
    .set({
      label,
      category: params.data.category || null,
      neededCount: normalizeNeededCount(params.data.neededCount),
      // Bump updatedAt so the realtime version probe sees the change.
      updatedAt: new Date(),
    })
    .where(eq(eventSlots.id, params.slotId));

  return { ok: true };
}

/**
 * Delete a slot, host-only. Items previously claimed against it keep existing
 * as contributions (the FK is ON DELETE SET NULL), they just stop counting
 * toward a slot.
 */
export async function deleteSlot(params: {
  slotId: number;
  userId: string;
}): Promise<SlotMutationResult> {
  const auth = await authorizeSlotMutation(params.slotId, params.userId);
  if (!auth.authorized) {
    return { ok: false, reason: auth.reason };
  }

  // Detach already-claimed contributions before removing the slot so they
  // survive (the item stays, just unlinked). We null `slotId` explicitly
  // rather than rely on `onDelete: set null`, because SQLite's
  // ALTER TABLE ADD COLUMN drops the FK action — the migration emits a bare
  // REFERENCES, so D1 would otherwise block the delete (or leave a dangling
  // ref). Doing it here is correct regardless of the column's FK action.
  await db
    .update(items)
    .set({ slotId: null })
    .where(eq(items.slotId, params.slotId));

  await db.delete(eventSlots).where(eq(eventSlots.id, params.slotId));

  return { ok: true };
}

export type ClaimSlotResult =
  | { ok: true; itemId: number }
  | { ok: false; reason: "not_found" | "full" };

/**
 * Claim an open slot for `participantId`: this creates an item owned by that
 * participant, linked to the slot, and seeded from the slot (its label becomes
 * the item name, its category carries over — defaulting to "autre" when the
 * slot is category-less). Any event participant may claim.
 *
 * Over-claim protection: the slot's open count is re-derived here (neededCount
 * − items already linked) and the claim is refused with "full" if none remain.
 * The count is read immediately before the insert; D1/SQLite serialises writes
 * within a request, so under normal contention a second concurrent claim that
 * would exceed neededCount loses the race and is rejected here.
 */
export async function claimSlot(params: {
  slotId: number;
  participantId: number;
  data?: { quantity?: string };
}): Promise<ClaimSlotResult> {
  const [slot] = await db
    .select()
    .from(eventSlots)
    .where(eq(eventSlots.id, params.slotId))
    .limit(1);

  if (!slot) {
    return { ok: false, reason: "not_found" };
  }

  const [agg] = await db
    .select({ claimed: sql<number>`count(*)` })
    .from(items)
    .where(eq(items.slotId, params.slotId));

  const claimed = Number(agg?.claimed ?? 0);
  if (claimed >= slot.neededCount) {
    return { ok: false, reason: "full" };
  }

  const [newItem] = await db
    .insert(items)
    .values({
      eventId: slot.eventId,
      participantId: params.participantId,
      slotId: slot.id,
      name: slot.label,
      category: slot.category || "autre",
      quantity: params.data?.quantity || null,
      dietaryTags: "[]",
    })
    .returning();

  return { ok: true, itemId: newItem.id };
}

/**
 * Get all events for a user (both hosted and joined)
 */
export async function getUserEvents(userId: string, upcoming: boolean = true) {
  const now = new Date();

  const hostedEvents = await db
    .select()
    .from(events)
    .where(eq(events.hostUserId, userId))
    .orderBy(desc(events.date));

  const participatedEvents = await db
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      description: events.description,
      hostName: events.hostName,
      hostUserId: events.hostUserId,
      shareCode: events.shareCode,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
    })
    .from(participants)
    .innerJoin(events, eq(participants.eventId, events.id))
    .where(and(eq(participants.userId, userId), eq(participants.isHost, false)))
    .orderBy(desc(events.date));

  const filterByDate = (eventList: typeof participatedEvents) => {
    return eventList.filter((event) => {
      const eventDate = new Date(event.date);
      const isPast = eventDate < now;
      return upcoming ? !isPast : isPast;
    });
  };

  return {
    hosted: filterByDate(hostedEvents),
    joined: filterByDate(participatedEvents),
  };
}

export async function isEventExisting(shareCode: string) {
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.shareCode, shareCode.toUpperCase()))
    .limit(1);
  return !!event;
}
