import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "$env/dynamic/private";
import { eq, and, desc } from "drizzle-orm";
import { events, participants, items, syncCodes } from "./schema";
import { generateUniqueShareCode, generateUniqueSyncCode } from "./utils";
import { gt } from "drizzle-orm";

/**
 * Database client for SvelteKit application
 *
 * Singleton pattern: Connection is created once and reused
 *
 * Aspire Integration:
 *   - Connection string from env.ConnectionStrings__popotedb
 *   - Automatically injected when running under Aspire
 */

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Convert .NET connection string format to PostgreSQL URL
 * Aspire provides: "Host=localhost;Port=5432;Database=db;Username=user;Password=pass"
 * postgres library expects: "postgresql://user:pass@localhost:5432/db"
 */
function convertConnectionString(connectionString: string): string {
  // If already in URL format, return as-is
  if (
    connectionString.startsWith("postgres://") ||
    connectionString.startsWith("postgresql://")
  ) {
    return connectionString;
  }

  // Parse .NET connection string format
  const params: Record<string, string> = {};
  connectionString.split(";").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      params[key.trim()] = value.trim();
    }
  });

  const host = params.Host || "localhost";
  const port = params.Port || "5432";
  const database = params.Database;
  const username = params.Username || params.User;
  const password = params.Password;

  if (!database || !username) {
    throw new Error("Invalid connection string: missing Database or Username");
  }

  return `postgresql://${username}:${password}@${host}:${port}/${database}`;
}

export function getDb() {
  if (!db) {
    const connectionString =
      env.ConnectionStrings__popotedb || env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        "Database connection string not found. Check Aspire configuration.",
      );
    }

    // Convert connection string format if needed
    const pgUrl = convertConnectionString(connectionString);

    // Create postgres connection pool
    client = postgres(pgUrl);
    db = drizzle(client, { schema });
  }

  return db;
}

// Cleanup on shutdown (for graceful server shutdown)
export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

// Export typed database instance
export type Database = NonNullable<typeof db>;

/**
 * Query helpers for page routes (replaces PocketBase service)
 */

export async function getEventByShareCode(shareCode: string) {
  const database = getDb();
  return await database.query.events.findFirst({
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
  const database = getDb();
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
  const database = getDb();
  return await database.query.participants.findMany({
    where: eq(participants.eventId, eventId),
  });
}

export async function getItemsByEventId(eventId: number) {
  const database = getDb();
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
  const database = getDb();

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
  const database = getDb();

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
  const database = getDb();
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
  const database = getDb();
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
  const database = getDb();
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
  const database = getDb();
  const event = await database.query.events.findFirst({
    where: eq(events.shareCode, shareCode.toUpperCase()),
  });
  return !!event;
}
