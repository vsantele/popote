import type { PageServerLoad, Actions } from "./$types";
import { superValidate } from "sveltekit-superforms/server";
import { fail, redirect } from "@sveltejs/kit";
import { createEventSchema } from "$lib/schemas/event.schema";
import { db } from "void/db";
import { events, participants } from "$lib/server/db/schema";
import { generateUniqueShareCode } from "$lib/server/db/utils";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";

import * as m from "$lib/paraglide/messages";
import { localizeHref } from "$lib/paraglide/runtime";

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod4(createEventSchema()));
  if (locals.user?.name && locals.user.name !== "Anonymous") {
    form.data.host_name = locals.user.name;
  }

  return { form };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(createEventSchema()));

    if (!form.valid) {
      return fail(400, { form });
    }

    if (!locals.user) {
      return fail(401, { form, error: m.error_session_invalid() });
    }

    let shareCode: string = "";
    try {
      shareCode = await generateUniqueShareCode();

      const [newEvent] = await db
        .insert(events)
        .values({
          name: form.data.name,
          date: new Date(form.data.date),
          location: form.data.location || null,
          description: form.data.description || null,
          hostName: form.data.host_name,
          hostUserId: locals.user!.id,
          shareCode,
        })
        .returning();

      const [hostParticipant] = await db
        .insert(participants)
        .values({
          eventId: newEvent.id,
          name: form.data.host_name,
          userId: locals.user!.id,
          isHost: true,
        })
        .returning();

      const result = { event: newEvent, participant: hostParticipant };

      log("info", "Event created via form action", {
        eventId: result.event.id,
        shareCode: shareCode,
      });
    } catch (err) {
      if (err instanceof Response) throw err;
      console.error("Error creating event:", err);
      log("error", "Failed to create event", { error: JSON.stringify(err) });
      return fail(500, {
        form,
        error: m.error_create_event_failed(),
      });
    }
    return redirect(303, localizeHref(`/e/${shareCode}`));
  },
};
