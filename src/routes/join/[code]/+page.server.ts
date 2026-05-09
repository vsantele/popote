import type { PageServerLoad, Actions } from "./$types";
import { superValidate } from "sveltekit-superforms/server";
import { fail, redirect, error } from "@sveltejs/kit";
import { z } from "zod";
import { db } from "void/db";
import { events, participants } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";
import * as m from "$lib/paraglide/messages";

function joinEventSchema() {
  return z.object({
    name: z.string().min(1, m.validation_name_required()),
  });
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const shareCode = params.code.toUpperCase();
  const userId = locals.user?.id;

  const event = await db.query.events.findFirst({
    where: eq(events.shareCode, shareCode),
    with: {
      participants: {
        where: (participants, { eq }) => eq(participants.userId, userId ?? ""),
      },
    },
  });

  if (!event) {
    throw error(404, m.error_event_not_found());
  }

  if (event.participants.length > 0) {
    return redirect(303, `/e/${shareCode}`);
  }

  const transformedEvent = {
    id: String(event.id),
    name: event.name,
    date: event.date.toISOString(),
    location: event.location || undefined,
    description: event.description || undefined,
    host_name: event.hostName,
    share_code: event.shareCode,
  };

  const form = await superValidate(zod4(joinEventSchema()));
  if (locals.user?.name) {
    form.data.name = locals.user.name;
  }

  return { form, event: transformedEvent };
};

export const actions: Actions = {
  default: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod4(joinEventSchema()));

    if (!form.valid) {
      return fail(400, { form });
    }

    if (!locals.user) {
      return fail(401, { form, error: m.error_session_invalid() });
    }

    try {
      const shareCode = params.code.toUpperCase();

      const selectedEvents = await db
        .select()
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1);
      const event = selectedEvents[0];

      if (!event) {
        return fail(404, {
          form,
          error: m.error_event_not_found(),
        });
      }

      await db.insert(participants).values({
        eventId: event.id,
        name: form.data.name,
        userId: locals.user.id,
        isHost: false,
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
        error: m.error_join_failed(),
      });
    }

    return redirect(303, `/e/${params.code}`);
  },
};
