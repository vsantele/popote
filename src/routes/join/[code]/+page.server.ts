import type { PageServerLoad, Actions } from "./$types";
import { superValidate } from "sveltekit-superforms/server";
import { fail, redirect, error } from "@sveltejs/kit";
import { z } from "zod";
import { db } from "void/db";
import { events, participants } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";
import * as m from "$lib/paraglide/messages";
import { localizeHref } from "$lib/paraglide/runtime";

function joinEventSchema() {
  return z.object({
    name: z.string().min(1, m.validation_name_required()),
    rsvp: z.enum(["going", "maybe", "not"]).default("going"),
    extraGuests: z.coerce
      .number()
      .int(m.validation_extra_guests_invalid())
      .min(0, m.validation_extra_guests_invalid())
      .max(50, m.validation_extra_guests_invalid())
      .default(0),
  });
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const shareCode = params.code.toUpperCase();
  const userId = locals.user?.id;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.shareCode, shareCode))
    .limit(1);

  if (!event) {
    throw error(404, m.error_event_not_found());
  }

  const existingParticipant = await db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.eventId, event.id),
        eq(participants.userId, userId ?? ""),
      ),
    )
    .limit(1);

  if (existingParticipant.length > 0) {
    return redirect(303, localizeHref(`/e/${shareCode}`));
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
        rsvp: form.data.rsvp,
        extraGuests: Math.max(0, Math.trunc(form.data.extraGuests || 0)),
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

    return redirect(303, localizeHref(`/e/${params.code}`));
  },
};
