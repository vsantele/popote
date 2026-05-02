import type { PageServerLoad, Actions } from "./$types";
import { superValidate } from "sveltekit-superforms/server";
import { fail, redirect, error } from "@sveltejs/kit";
import { z } from "zod";
import { db } from "void/db";
import { events, participants } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";
import { DEVICE_ID_KEY, USER_NAME_KEY } from "$lib/utils/device-id";

const joinEventSchema = z.object({
  name: z.string().min(1, "Votre nom est requis"),
});

export const load: PageServerLoad = async ({ params, cookies }) => {
  const shareCode = params.code.toUpperCase();

  // Fetch event to verify it exists (relational query API)
  const event = await db.query.events.findFirst({
    where: eq(events.shareCode, shareCode),
    with: {
      participants: {
        where: (participants, { eq }) =>
          eq(participants.deviceId, cookies.get(DEVICE_ID_KEY) || ""),
      },
    },
  });

  if (!event) {
    throw error(404, "Événement introuvable");
  }

  // Check if this device already has a participant
  if (event.participants.length > 0) {
    // Participant exists, redirect to event
    return redirect(303, `/e/${shareCode}`);
  }

  // Transform event for display
  const transformedEvent = {
    id: String(event.id),
    name: event.name,
    date: event.date.toISOString(),
    location: event.location || undefined,
    description: event.description || undefined,
    host_name: event.hostName,
    share_code: event.shareCode,
  };

  // Pre-fill form with stored username if available
  const storedUserName = cookies.get(USER_NAME_KEY);
  const form = await superValidate(zod4(joinEventSchema));
  if (storedUserName) {
    form.data.name = storedUserName;
  }

  return { form, event: transformedEvent };
};

export const actions: Actions = {
  default: async ({ request, params, cookies }) => {
    const form = await superValidate(request, zod4(joinEventSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const shareCode = params.code.toUpperCase();

      // Get event
      const selectedEvents = await db
        .select()
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1);
      const event = selectedEvents[0];

      if (!event) {
        return fail(404, {
          form,
          error: "Événement introuvable",
        });
      }

      // Get or create device ID
      let deviceId = cookies.get(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        cookies.set(DEVICE_ID_KEY, deviceId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      }

      // Create participant
      await db.insert(participants).values({
        eventId: event.id,
        name: form.data.name,
        deviceId,
        isHost: false,
      });

      // Store user name for future use
      cookies.set(USER_NAME_KEY, form.data.name, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });

      log("info", "Guest joined event", {
        eventId: event.id,
        guestName: form.data.name,
      });
    } catch (err) {
      if (err instanceof Response) throw err;
      console.error("Error joining event:", err);
      log("error", "Failed to join event", { error: JSON.stringify(err) });
      return fail(500, {
        form,
        error: "Impossible de rejoindre. Veuillez réessayer.",
      });
    }

    return redirect(303, `/e/${params.code}`);
  },
};
