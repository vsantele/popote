import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { events, participants, items } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { isValidShareCode } from "$lib/server/db/utils";

/**
 * GET /api/events/[code]
 * Get event details by share code
 *
 * Response:
 * - 200: { event, participants, items }
 * - 400: { error: 'Invalid share code format' }
 * - 404: { error: 'Event not found' }
 * - 500: { error: 'Internal server error' }
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { code } = params;

    // Validate share code format
    if (!isValidShareCode(code)) {
      return json({ error: "Invalid share code format" }, { status: 400 });
    }

    const db = getDb();

    // Fetch event with relations using Drizzle query API
    const event = await db.query.events.findFirst({
      where: eq(events.shareCode, code),
      with: {
        participants: true,
        items: {
          with: {
            participant: true,
          },
        },
      },
    });

    if (!event) {
      return json({ error: "Event not found" }, { status: 404 });
    }

    return json({
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        description: event.description,
        hostName: event.hostName,
        hostDeviceId: event.hostDeviceId,
        shareCode: event.shareCode,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
      participants: event.participants,
      items: event.items,
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    return json({ error: "Failed to fetch event" }, { status: 500 });
  }
};
