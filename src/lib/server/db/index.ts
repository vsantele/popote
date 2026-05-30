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
