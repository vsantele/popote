import type { PageServerLoad, Actions } from "./$types";
import { db } from "void/db";
import { events, participants, items } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms/server";
import { addItemSchema } from "$lib/schemas/item.schema";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";

import * as m from "$lib/paraglide/messages";
import { localizeHref } from "$lib/paraglide/runtime";

export const load: PageServerLoad = async ({ params, locals }) => {
  const shareCode = params.code.toUpperCase();
  const userId = locals.user?.id;

  const event = await db.query.events.findFirst({
    where: eq(events.shareCode, shareCode),
    with: {
      participants: true,
      items: true,
    },
  });

  if (!event) {
    throw error(404, m.error_event_not_found());
  }

  // If the visitor isn't the host and isn't already a participant, send them
  // to /join so they can pick a display name first.
  const isHost = userId && event.hostUserId === userId;
  const alreadyJoined = event.participants.some((p) => p.userId === userId);

  if (!isHost && !alreadyJoined) {
    return redirect(303, localizeHref(`/join/${shareCode}`));
  }

  const transformedEvent = {
    id: String(event.id),
    name: event.name,
    date: event.date.toISOString(),
    location: event.location || undefined,
    description: event.description || undefined,
    host_name: event.hostName,
    host_user_id: event.hostUserId,
    share_code: event.shareCode,
    created: event.createdAt.toISOString(),
  };

  const transformedParticipants = event.participants.map((p) => ({
    id: String(p.id),
    event: String(event.id),
    name: p.name,
    user_id: p.userId,
    is_host: p.isHost,
    created: p.createdAt.toISOString(),
  }));

  const transformedItems = event.items.map((i) => ({
    id: String(i.id),
    event: String(event.id),
    participant: String(i.participantId),
    name: i.name,
    category: i.category,
    quantity: i.quantity || undefined,
    created: i.createdAt.toISOString(),
  }));

  const currentParticipant = transformedParticipants.find(
    (p) => p.user_id === userId,
  );

  const form = await superValidate(zod4(addItemSchema()));

  return {
    event: transformedEvent,
    participants: transformedParticipants,
    items: transformedItems,
    currentParticipant,
    form,
  };
};

export const actions: Actions = {
  addItem: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod4(addItemSchema()));

    if (!form.valid) {
      return fail(400, { form });
    }

    if (!locals.user) {
      return fail(401, {
        form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const shareCode = params.code.toUpperCase();
      const userId = locals.user.id;

      const event = await db.query.events.findFirst({
        where: eq(events.shareCode, shareCode),
        with: {
          participants: {
            where: (participants, { eq }) => eq(participants.userId, userId),
          },
        },
      });

      if (!event) {
        return fail(404, {
          form,
          error: m.error_event_not_found(),
        });
      }

      const participant = event.participants[0];
      let participantId: number;

      if (!participant) {
        const [newParticipant] = await db
          .insert(participants)
          .values({
            eventId: event.id,
            name: locals.user!.name,
            userId,
            isHost: false,
          })
          .returning();
        participantId = newParticipant.id;
      } else {
        participantId = participant.id;
      }

      await db.insert(items).values({
        eventId: event.id,
        participantId,
        name: form.data.name,
        category: form.data.category,
        quantity: form.data.quantity || null,
      });

      return { form };
    } catch (err) {
      log("error", "Failed to add item", { error: String(err) });
      return fail(500, {
        form,
        error: m.error_add_item_failed(),
      });
    }
  },
};
