import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { events, participants } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidShareCode } from "$lib/server/db/utils";

/**
 * POST /api/events/[code]/join
 * Join an event as a participant
 *
 * Request body:
 * - name: Participant's display name (required)
 * - deviceId: Device ID for anonymous auth (required)
 *
 * Response:
 * - 201: { participant }
 * - 400: { error: 'Missing required fields' }
 * - 404: { error: 'Event not found' }
 * - 409: { error: 'Already joined' }
 * - 500: { error: 'Internal server error' }
 */
export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const { code } = params;
    const body = await request.json();
    const { name, deviceId } = body;

    // Validate share code format
    if (!isValidShareCode(code)) {
      return json({ error: "Invalid share code format" }, { status: 400 });
    }

    // Validate required fields
    if (!name || !deviceId) {
      return json(
        { error: "Missing required fields: name, deviceId" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Check if event exists
    const event = await db.query.events.findFirst({
      where: eq(events.shareCode, code),
    });

    if (!event) {
      return json({ error: "Event not found" }, { status: 404 });
    }

    // Check if already joined
    const existingParticipant = await db.query.participants.findFirst({
      where: and(
        eq(participants.eventId, event.id),
        eq(participants.deviceId, deviceId),
      ),
    });

    if (existingParticipant) {
      return json({ error: "Already joined this event" }, { status: 409 });
    }

    // Create participant
    const [newParticipant] = await db
      .insert(participants)
      .values({
        eventId: event.id,
        name,
        deviceId,
        isHost: false,
        updatedAt: new Date(),
      })
      .returning();

    return json(
      {
        participant: newParticipant,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error joining event:", error);
    return json({ error: "Failed to join event" }, { status: 500 });
  }
};
