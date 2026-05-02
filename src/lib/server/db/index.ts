import { events, participants, items, syncCodes } from "@schema";
import { generateUniqueShareCode, generateUniqueSyncCode } from "./utils";
import { db, eq, and, desc, gt } from "void/db";

// Export typed database instance
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
  hostDeviceId: string;
}) {
  const database = db;
  const shareCode = await generateUniqueShareCode();

  // Use transaction to ensure atomicity
  const result = await database.transaction(async (tx) => {
    const [newEvent] = await tx
      .insert(events)
      .values({
        name: eventData.name,
        date: eventData.date,
        location: eventData.location || null,
        description: eventData.description || null,
        hostName: eventData.hostName,
        hostDeviceId: eventData.hostDeviceId,
        shareCode,
      })
      .returning();

    const [hostParticipant] = await tx
      .insert(participants)
      .values({
        eventId: newEvent.id,
        name: eventData.hostName,
        deviceId: eventData.hostDeviceId,
        isHost: true,
      })
      .returning();

    return { event: newEvent, participant: hostParticipant };
  });

  return {
    share_code: result.event.shareCode,
    ...result.event,
  };
}

export async function getParticipantsByEventId(eventId: number) {
  const database = db;
  return await database.query.participants.findMany({
    where: eq(participants.eventId, eventId),
  });
}

export async function getItemsByEventId(eventId: number) {
  const database = db;
  return await database.query.items.findMany({
    where: eq(items.eventId, eventId),
    with: {
      participant: true,
    },
  });
}

export async function findOrCreateParticipant(
  eventId: number,
  deviceId: string,
  name: string,
) {
  const database = db;

  // Try to find existing participant
  const existing = await database.query.participants.findFirst({
    where: and(
      eq(participants.eventId, eventId),
      eq(participants.deviceId, deviceId),
    ),
  });

  if (existing) {
    return existing;
  }

  // Create new participant
  const [newParticipant] = await database
    .insert(participants)
    .values({
      eventId,
      name,
      deviceId,
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
  const database = db;

  const [newItem] = await database
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
 * Returns events where user is either the host or a participant
 */
export async function getUserEvents(
  deviceId: string,
  upcoming: boolean = true,
) {
  const database = db;
  const now = new Date();

  // Get events where user is host
  const hostedEvents = await database
    .select()
    .from(events)
    .where(eq(events.hostDeviceId, deviceId))
    .orderBy(desc(events.date));

  // Get events where user is a participant (not host)
  const participatedEvents = await database
    .select({
      id: events.id,
      name: events.name,
      date: events.date,
      location: events.location,
      description: events.description,
      hostName: events.hostName,
      hostDeviceId: events.hostDeviceId,
      shareCode: events.shareCode,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
    })
    .from(participants)
    .innerJoin(events, eq(participants.eventId, events.id))
    .where(
      and(eq(participants.deviceId, deviceId), eq(participants.isHost, false)),
    )
    .orderBy(desc(events.date));

  // Filter by upcoming or past
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

export async function createSyncCode(deviceId: string) {
  const database = db;
  const code = await generateUniqueSyncCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Clear existing codes for this device
  await database.delete(syncCodes).where(eq(syncCodes.deviceId, deviceId));

  await database.insert(syncCodes).values({
    code,
    deviceId,
    expiresAt,
  });

  return code;
}

export async function getDeviceIdBySyncCode(code: string) {
  const database = db;
  const now = new Date();

  const result = await database.query.syncCodes.findFirst({
    where: and(
      eq(syncCodes.code, code.toUpperCase()),
      gt(syncCodes.expiresAt, now),
    ),
  });

  if (!result) return null;

  // Delete code after use (one-time)
  await database.delete(syncCodes).where(eq(syncCodes.id, result.id));

  return result.deviceId;
}

export async function isEventExisting(shareCode: string) {
  const database = db;
  const event = await database.query.events.findFirst({
    where: eq(events.shareCode, shareCode.toUpperCase()),
  });
  return !!event;
}
