import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { events, participants } from "$lib/server/db/schema";
import { generateUniqueShareCode } from "$lib/server/db/utils";

/**
 * POST /api/events
 * Create a new event with auto-generated share code
 *
 * Request body:
 * - name: Event name (required)
 * - date: ISO timestamp (required)
 * - location: Location string (optional)
 * - description: Event description (optional)
 * - hostName: Host's display name (required)
 * - hostDeviceId: Device ID for anonymous auth (required)
 *
 * Response:
 * - 201: { id, shareCode, event }
 * - 400: { error: 'Missing required fields' }
 * - 500: { error: 'Internal server error' }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, date, location, description, hostName, hostDeviceId } = body;

    // Validate required fields
    if (!name || !date || !hostName || !hostDeviceId) {
      return json(
        {
          error: "Missing required fields: name, date, hostName, hostDeviceId",
        },
        { status: 400 },
      );
    }

    const db = getDb();

    // Generate unique share code
    const shareCode = await generateUniqueShareCode();

    // Create event
    const [newEvent] = await db
      .insert(events)
      .values({
        name,
        date: new Date(date),
        location: location || null,
        description: description || null,
        hostName,
        hostDeviceId,
        shareCode,
        updatedAt: new Date(),
      })
      .returning();

    // Auto-create host participant
    await db.insert(participants).values({
      eventId: newEvent.id,
      name: hostName,
      deviceId: hostDeviceId,
      isHost: true,
      updatedAt: new Date(),
    });

    return json(
      {
        id: newEvent.id,
        shareCode: newEvent.shareCode,
        event: newEvent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return json({ error: "Failed to create event" }, { status: 500 });
  }
};
