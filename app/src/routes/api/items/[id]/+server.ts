import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDb } from "$lib/server/db";
import { items, participants } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * DELETE /api/items/[id]
 * Delete an item (owner only)
 *
 * Query params:
 * - deviceId: Device ID for authorization (required)
 *
 * Response:
 * - 204: Success (no content)
 * - 400: { error: 'Missing deviceId' }
 * - 403: { error: 'Not authorized to delete this item' }
 * - 404: { error: 'Item not found' }
 * - 500: { error: 'Internal server error' }
 */
export const DELETE: RequestHandler = async ({ params, url }) => {
  try {
    const itemId = parseInt(params.id, 10);
    const deviceId = url.searchParams.get("deviceId");

    if (!deviceId) {
      return json(
        { error: "Missing deviceId query parameter" },
        { status: 400 },
      );
    }

    if (isNaN(itemId)) {
      return json({ error: "Invalid item ID" }, { status: 400 });
    }

    const db = getDb();

    // Fetch item with participant info
    const [item] = await db
      .select()
      .from(items)
      .where(eq(items.id, itemId))
      .leftJoin(participants, eq(participants.id, items.participantId))
      .limit(1);

    if (!item) {
      return json({ error: "Item not found" }, { status: 404 });
    }

    // Verify ownership: device ID must match item creator's device ID
    if (item.participants?.deviceId !== deviceId) {
      return json(
        { error: "Not authorized to delete this item" },
        { status: 403 },
      );
    }

    // Delete item
    await db.delete(items).where(eq(items.id, itemId));

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting item:", error);
    return json({ error: "Failed to delete item" }, { status: 500 });
  }
};
