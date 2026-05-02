import { events, participants, items } from "@schema";
import { generateUniqueShareCode } from "./utils";
import { db, eq, and, desc } from "void/db";

export type Database = NonNullable<typeof db>;

export async function getEventByShareCode(shareCode: string) {
  return await db.query.events.findFirst({
    where: eq(events.shareCode, shareCode.toUpperCase()),
    with: {
      participants: true,
      items: {
        with: {
          participant: true,
        },
      },
    },
  });
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
  return await db.query.participants.findMany({
    where: eq(participants.eventId, eventId),
  });
}

export async function getItemsByEventId(eventId: number) {
  return await db.query.items.findMany({
    where: eq(items.eventId, eventId),
    with: {
      participant: true,
    },
  });
}

export async function findOrCreateParticipant(
  eventId: number,
  userId: string,
  name: string,
) {
  const existing = await db.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      eq(participants.userId, userId),
    ),
  });

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
  const event = await db.query.events.findFirst({
    where: eq(events.shareCode, shareCode.toUpperCase()),
  });
  return !!event;
}
