import type { PageServerLoad, Actions } from "./$types";
import { superValidate } from "sveltekit-superforms/server";
import { fail, redirect } from "@sveltejs/kit";
import { createEventSchema } from "$lib/schemas/event.schema";
import { getDb } from "$lib/server/db";
import { events, participants } from "$lib/server/db/schema";
import { generateUniqueShareCode } from "$lib/server/db/utils";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";
import { DEVICE_ID_KEY, USER_NAME_KEY } from "$lib/utils/device-id";

export const load: PageServerLoad = async ({ cookies }) => {
  // Get stored username from cookie
  const storedUserName = cookies.get(USER_NAME_KEY);

  // Pre-fill form with stored username if available
  const form = await superValidate(zod4(createEventSchema));
  if (storedUserName) {
    form.data.host_name = storedUserName;
  }

  return { form };
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, zod4(createEventSchema));

    if (!form.valid) {
      return fail(400, { form });
    }
    let shareCode: string = "";
    try {
      // Get device ID from cookie or generate new one
      let deviceId = cookies.get(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        cookies.set(DEVICE_ID_KEY, deviceId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
      }

      const db = getDb();
      shareCode = await generateUniqueShareCode();

      // Create event and host participant in a transaction (atomic operation)
      const result = await db.transaction(async (tx) => {
        const [newEvent] = await tx
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
          .returning();

        const [hostParticipant] = await tx
          .insert(participants)
          .values({
            eventId: newEvent.id,
            name: form.data.host_name,
            deviceId,
            isHost: true,
          })
          .returning();

        return { event: newEvent, participant: hostParticipant };
      });

      log("info", "Event created via form action", {
        eventId: result.event.id,
        shareCode: shareCode,
      });

      // Store host name in cookie for future use
      cookies.set(USER_NAME_KEY, form.data.host_name, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });

      // Redirect to event page
    } catch (err) {
      if (err instanceof Response) throw err; // Re-throw redirects
      console.error("Error creating event:", err);
      log("error", "Failed to create event", { error: JSON.stringify(err) });
      return fail(500, {
        form,
        error: "Impossible de créer la soirée. Veuillez réessayer.",
      });
    }
    return redirect(303, `/e/${shareCode}`);
  },
};
