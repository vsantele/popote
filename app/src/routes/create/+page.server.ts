import type { PageServerLoad, Actions } from "./$types"
import { superValidate } from "sveltekit-superforms/server"
import { fail, redirect } from "@sveltejs/kit"
import { createEventSchema } from "$lib/schemas/event.schema"
import { getDb } from "$lib/server/db"
import { events, participants } from "$lib/server/db/schema"
import { generateUniqueShareCode } from "$lib/server/db/utils"
import { log } from "$lib/utils/logger"
import { zod4 } from "sveltekit-superforms/adapters"

export const load: PageServerLoad = async () => {
  const form = await superValidate(zod4(createEventSchema))
  return { form }
}

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, zod4(createEventSchema))

    if (!form.valid) {
      return fail(400, { form })
    }
    let shareCode: string = ""
    try {
      // Get device ID from cookie or generate new one
      let deviceId = cookies.get("deviceId")
      if (!deviceId) {
        deviceId = crypto.randomUUID()
        cookies.set("deviceId", deviceId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        })
      }

      const db = getDb()
      shareCode = await generateUniqueShareCode()

      // Create event
      const [newEvent] = await db
        .insert(events)
        .values({
          name: form.data.name,
          date: new Date(form.data.date),
          location: form.data.location || null,
          description: form.data.description || null,
          hostName: form.data.host_name,
          hostDeviceId: deviceId,
          shareCode,
        })
        .returning()

      // Auto-create host participant
      await db.insert(participants).values({
        eventId: newEvent.id,
        name: form.data.host_name,
        deviceId,
        isHost: true,
      })

      log("info", "Event created via form action", {
        eventId: newEvent.id,
        shareCode: shareCode,
      })

      // Store host name in cookie for future use
      cookies.set("userName", form.data.host_name, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      })

      // Redirect to event page
    } catch (err) {
      if (err instanceof Response) throw err // Re-throw redirects
      console.error("Error creating event:", err)
      log("error", "Failed to create event", { error: JSON.stringify(err) })
      return fail(500, {
        form,
        error: "Impossible de créer la soirée. Veuillez réessayer.",
      })
    }
    return redirect(303, `/e/${shareCode}`)
  },
}
