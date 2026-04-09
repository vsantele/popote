import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { events, items } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { isValidShareCode } from "$lib/server/db/utils";

/**
 * GET /api/events/[code]/items
 * List all items for an event by share code
 *
 * Response:
 * - 200: { items: [...] }
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

    // Check if event exists
    const event = await db.query.events.findFirst({
      where: eq(events.shareCode, code),
    });

    if (!event) {
      return json({ error: "Event not found" }, { status: 404 });
    }

    // Fetch all items with participant info
    const eventItems = await db.query.items.findMany({
      where: eq(items.eventId, event.id),
      with: {
        participant: true,
      },
    });

    return json({
      items: eventItems,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return json({ error: "Failed to fetch items" }, { status: 500 });
  }
};
