import type { PageServerLoad, Actions } from "./$types"
import { getDb } from "$lib/server/db"
import { events, participants, items } from "$lib/server/db/schema"
import { eq, and } from "drizzle-orm"
import { error, fail, redirect } from "@sveltejs/kit"
import { superValidate } from "sveltekit-superforms/server"
import { addItemSchema } from "$lib/schemas/item.schema"
import { log } from "$lib/utils/logger"
import { zod4 } from "sveltekit-superforms/adapters"

export const load: PageServerLoad = async ({ params, cookies }) => {
  const shareCode = params.code.toUpperCase()
  const db = getDb()

  // Fetch event by share code with related data
  const selectedEvents = await db
    .select()
    .from(events)
    .where(eq(events.shareCode, shareCode))
    .limit(1)
  const event = selectedEvents[0]

  if (!event) {
    throw error(404, "Événement introuvable")
  }

  // Check if user has a name stored - if not, redirect to join
  const userName = cookies.get("userName")
  const deviceId = cookies.get("deviceId")
  
  // If no userName, they need to join first (unless they're the host)
  if (!userName && deviceId !== event.hostDeviceId) {
    return redirect(303, `/join/${shareCode}`)
  }

  const eventParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, event.id))

  const eventItems = await db
    .select()
    .from(items)
    .where(eq(items.eventId, event.id))

  // Transform to match frontend types
  const transformedEvent = {
    id: String(event.id),
    name: event.name,
    date: event.date.toISOString(),
    location: event.location || undefined,
    description: event.description || undefined,
    host_name: event.hostName,
    host_device_id: event.hostDeviceId,
    share_code: event.shareCode,
    created: event.createdAt.toISOString(),
  }

  const transformedParticipants = eventParticipants.map((p) => ({
    id: String(p.id),
    event: String(event.id),
    name: p.name,
    device_id: p.deviceId,
    is_host: p.isHost,
    created: p.createdAt.toISOString(),
  }))

  const transformedItems = eventItems.map((i) => ({
    id: String(i.id),
    event: String(event.id),
    participant: String(i.participantId),
    name: i.name,
    category: i.category as any,
    quantity: i.quantity || undefined,
    created: i.createdAt.toISOString(),
  }))

  // Initialize form
  const form = await superValidate(zod4(addItemSchema))

  return {
    event: transformedEvent,
    participants: transformedParticipants,
    items: transformedItems,
    form,
  }
}

export const actions: Actions = {
  addItem: async ({ request, params, cookies }) => {
    const form = await superValidate(request, zod4(addItemSchema))

    if (!form.valid) {
      return fail(400, { form })
    }

    try {
      const shareCode = params.code.toUpperCase()
      const db = getDb()

      // Get event by share code
      const selectedEvents = await db
        .select()
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1)
      const event = selectedEvents[0]

      if (!event) {
        return fail(404, {
          form,
          error: "Événement introuvable",
        })
      }

      // Get device ID and user name from cookies
      const deviceId = cookies.get("deviceId")
      const userName = cookies.get("userName")

      if (!deviceId || !userName) {
        // Should not happen if load function redirects properly
        return fail(401, {
          form,
          error: "Session invalide. Veuillez rejoindre l'événement.",
        })
      }

      // Find participant by device ID
      const participantResults = await db
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.eventId, event.id),
            eq(participants.deviceId, deviceId),
          ),
        )
        .limit(1)
      const participant = participantResults[0]

      if (!participant) {
        // Create participant if doesn't exist (defensive)
        const [newParticipant] = await db
          .insert(participants)
          .values({
            eventId: event.id,
            name: userName,
            deviceId,
            isHost: false,
          })
          .returning()

        // Create item with new participant
        await db.insert(items).values({
          eventId: event.id,
          participantId: newParticipant.id,
          name: form.data.name,
          category: form.data.category,
          quantity: form.data.quantity || null,
        })
      } else {
        // Create item with existing participant
        await db.insert(items).values({
          eventId: event.id,
          participantId: participant.id,
          name: form.data.name,
          category: form.data.category,
          quantity: form.data.quantity || null,
        })
      }

      log("info", "Item added via form action", {
        eventId: event.id,
        participantName: userName,
      })

      return { form }
    } catch (err) {
      log("error", "Failed to add item", { error: String(err) })
      return fail(500, {
        form,
        error: "Impossible d'ajouter l'item. Veuillez réessayer.",
      })
    }
  },
}
