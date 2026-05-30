import { events, participants, items } from "@schema";
import { generateUniqueShareCode } from "./utils";
import { db, eq, and, desc } from "void/db";

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
    items: itemRows.map((r) => ({ ...r.item, participant: r.participant })),
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

  return rows.map((r) => ({ ...r.item, participant: r.participant }));
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
}) {
  const [newItem] = await db
    .insert(items)
    .values({
      eventId: itemData.eventId,
      participantId: itemData.participantId,
      name: itemData.name,
      category: itemData.category,
      quantity: itemData.quantity || null,
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
  data: { name: string; category: string; quantity?: string };
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
