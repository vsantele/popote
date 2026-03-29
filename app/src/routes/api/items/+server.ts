import { json } from "@sveltejs/kit"
import type { RequestHandler } from "./$types"
import { getDb } from "$lib/server/db"
import { items, participants } from "$lib/server/db/schema"
import { eq, and } from "drizzle-orm"
import { VALID_CATEGORIES } from "$lib/server/db/schema"

/**
 * POST /api/items
 * Add an item to an event
 *
 * Request body:
 * - eventId: Event ID (required)
 * - name: Item name (required)
 * - category: Item category (required, must be one of VALID_CATEGORIES)
 * - quantity: Item quantity (optional)
 * - deviceId: Device ID for anonymous auth (required)
 *
 * Response:
 * - 201: { item }
 * - 400: { error: 'Missing required fields' | 'Invalid category' }
 * - 403: { error: 'Not a participant of this event' }
 * - 500: { error: 'Internal server error' }
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json()
    const { eventId, name, category, quantity, deviceId } = body

    // Validate required fields
    if (!eventId || !name || !category || !deviceId) {
      return json(
        { error: "Missing required fields: eventId, name, category, deviceId" },
        { status: 400 },
      )
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      return json(
        {
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      )
    }

    const db = getDb()

    // Verify participant exists for this event and device
    const participant = await db.query.participants.findFirst({
      where: and(
        eq(participants.eventId, eventId),
        eq(participants.deviceId, deviceId),
      ),
    })

    if (!participant) {
      return json({ error: "Not a participant of this event" }, { status: 403 })
    }

    // Create item
    const [newItem] = await db
      .insert(items)
      .values({
        eventId,
        participantId: participant.id,
        name,
        category,
        quantity: quantity || null,
        updatedAt: new Date(),
      })
      .returning()

    return json(
      {
        item: newItem,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error adding item:", error)
    return json({ error: "Failed to add item" }, { status: 500 })
  }
}
