import type { PageServerLoad, Actions } from "./$types";
import { getDb } from "$lib/server/db";
import { events, participants, items } from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms/server";
import { addItemSchema } from "$lib/schemas/item.schema";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";
import { DEVICE_ID_KEY, USER_NAME_KEY } from "$lib/utils/device-id";

export const load: PageServerLoad = async ({ params, cookies }) => {
  const shareCode = params.code.toUpperCase();
  const db = getDb();

  // Fetch event by share code with related data (single query with joins)
  const event = await db.query.events.findFirst({
    where: eq(events.shareCode, shareCode),
    with: {
      participants: true,
      items: true,
    },
  });

  if (!event) {
    throw error(404, "Événement introuvable");
  }

  // Check if user has a name stored - if not, redirect to join
  const userName = cookies.get(USER_NAME_KEY);
  const deviceId = cookies.get(DEVICE_ID_KEY);

  // If no userName, they need to join first (unless they're the host)
  if (!userName && deviceId !== event.hostDeviceId) {
    return redirect(303, `/join/${shareCode}`);
  }

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
  };

  const transformedParticipants = event.participants.map((p) => ({
    id: String(p.id),
    event: String(event.id),
    name: p.name,
    device_id: p.deviceId,
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

  // Find current participant for optimistic updates
  const currentParticipant = transformedParticipants.find(
    (p) => p.device_id === deviceId,
  );

  // Initialize form
  const form = await superValidate(zod4(addItemSchema));

  return {
    event: transformedEvent,
    participants: transformedParticipants,
    items: transformedItems,
    currentParticipant,
    form,
  };
};

export const actions: Actions = {
  addItem: async ({ request, params, cookies }) => {
    const form = await superValidate(request, zod4(addItemSchema));

    if (!form.valid) {
      return fail(400, { form });
    }

    try {
      const shareCode = params.code.toUpperCase();
      const db = getDb();

      // Get event by share code (relational query)
      const event = await db.query.events.findFirst({
        where: eq(events.shareCode, shareCode),
        with: {
          participants: {
            where: (participants, { eq }) => eq(participants.deviceId, cookies.get(DEVICE_ID_KEY) || ""),
          },
        },
      });

      if (!event) {
        return fail(404, {
          form,
          error: "Événement introuvable",
        });
      }

      // Get device ID and user name from cookies
      const deviceId = cookies.get(DEVICE_ID_KEY);
      const userName = cookies.get(USER_NAME_KEY);

      if (!deviceId || !userName) {
        // Should not happen if load function redirects properly
        return fail(401, {
          form,
          error: "Session invalide. Veuillez rejoindre l'événement.",
        });
      }

      const participant = event.participants[0];

      // Use transaction for participant + item creation (atomic)
      await db.transaction(async (tx) => {
        let participantId: number;

        if (!participant) {
          // Create participant if doesn't exist (defensive)
          const [newParticipant] = await tx
            .insert(participants)
            .values({
              eventId: event.id,
              name: userName,
              deviceId,
              isHost: false,
            })
            .returning();
          participantId = newParticipant.id;
        } else {
          participantId = participant.id;
        }

        // Create item
        await tx.insert(items).values({
          eventId: event.id,
          participantId,
          name: form.data.name,
          category: form.data.category,
          quantity: form.data.quantity || null,
        });
      });

      return { form };
    } catch (err) {
      log("error", "Failed to add item", { error: String(err) });
      return fail(500, {
        form,
        error: "Impossible d'ajouter l'item. Veuillez réessayer.",
      });
    }
  },
};
