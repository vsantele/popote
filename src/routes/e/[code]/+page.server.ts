import type { PageServerLoad, Actions } from "./$types";
import { db } from "void/db";
import { events, participants, items } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import { error, fail, redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms/server";
import {
  addItemSchema,
  editItemSchema,
  deleteItemSchema,
} from "$lib/schemas/item.schema";
import { rsvpSchema } from "$lib/schemas/rsvp.schema";
import {
  createSlotSchema,
  editSlotSchema,
  deleteSlotSchema,
  claimSlotSchema,
} from "$lib/schemas/slot.schema";
import {
  updateItem,
  deleteItem,
  updateRsvp,
  getSlotsByEventId,
  createSlot,
  updateSlot,
  deleteSlot,
  claimSlot,
} from "$lib/server/db";
import { log } from "$lib/utils/logger";
import { zod4 } from "sveltekit-superforms/adapters";
import { VALID_DIETARY_TAGS } from "$lib/types/index";
import type { DietaryTag, ItemCategory } from "$lib/types/index";

// Item categories reused for slots. Mirrors VALID_CATEGORIES in the schema;
// kept as a local const so the page-server module needn't import server-only
// schema constants into the client transform path.
const VALID_CATEGORIES: readonly ItemCategory[] = [
  "apero",
  "entree",
  "plat",
  "dessert",
  "boissons",
  "jeux",
  "autre",
];

/** Parse a JSON dietary tags string from DB, dropping unknown tag keys. */
function parseDietaryTagsJson(raw: string | null | undefined): DietaryTag[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is DietaryTag =>
      (VALID_DIETARY_TAGS as readonly string[]).includes(t),
    );
  } catch {
    return [];
  }
}

import * as m from "$lib/paraglide/messages";
import { localizeHref } from "$lib/paraglide/runtime";

export const load: PageServerLoad = async ({ params, locals }) => {
  const shareCode = params.code.toUpperCase();
  const userId = locals.user?.id;

  // NOTE: the core query builder (db.select) is used instead of the
  // relational API (db.query.events.findFirst({ with })) because the schema
  // is only injected into `db` by Void's Vite virtual module — which is not
  // applied to SvelteKit's server modules in local dev, leaving db.query.*
  // undefined. db.select works identically in dev and production.
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.shareCode, shareCode))
    .limit(1);

  if (!event) {
    throw error(404, m.error_event_not_found());
  }

  const [eventParticipants, eventItems, eventSlots] = await Promise.all([
    db.select().from(participants).where(eq(participants.eventId, event.id)),
    db.select().from(items).where(eq(items.eventId, event.id)),
    getSlotsByEventId(event.id),
  ]);

  // If the visitor isn't the host and isn't already a participant, send them
  // to /join so they can pick a display name first.
  const isHost = userId && event.hostUserId === userId;
  const alreadyJoined = eventParticipants.some((p) => p.userId === userId);

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

  const transformedParticipants = eventParticipants.map((p) => ({
    id: String(p.id),
    event: String(event.id),
    name: p.name,
    user_id: p.userId,
    is_host: p.isHost,
    rsvp: p.rsvp,
    extra_guests: p.extraGuests,
    created: p.createdAt.toISOString(),
  }));

  const transformedItems = eventItems.map((i) => ({
    id: String(i.id),
    event: String(event.id),
    participant: String(i.participantId),
    name: i.name,
    category: i.category,
    quantity: i.quantity || undefined,
    dietary_tags: parseDietaryTagsJson(i.dietaryTags),
    created: i.createdAt.toISOString(),
  }));

  const transformedSlots = eventSlots.map((s) => ({
    id: String(s.id),
    label: s.label,
    // Coerce the loosely-typed DB category into a known ItemCategory, or
    // undefined for a category-less need (e.g. "ice", "plates").
    category: VALID_CATEGORIES.includes(s.category as ItemCategory)
      ? (s.category as ItemCategory)
      : undefined,
    needed_count: s.neededCount,
    claimed_count: s.claimedCount,
    open_count: s.openCount,
  }));

  const currentParticipant = transformedParticipants.find(
    (p) => p.user_id === userId,
  );

  const form = await superValidate(zod4(addItemSchema()));
  const editForm = await superValidate(zod4(editItemSchema()));
  const deleteForm = await superValidate(zod4(deleteItemSchema()));
  const rsvpForm = await superValidate(zod4(rsvpSchema()));
  const createSlotForm = await superValidate(zod4(createSlotSchema()));
  const editSlotForm = await superValidate(zod4(editSlotSchema()));
  const deleteSlotForm = await superValidate(zod4(deleteSlotSchema()));
  const claimSlotForm = await superValidate(zod4(claimSlotSchema()));
  // Seed the RSVP form with the current participant's saved choice so the
  // control reflects their actual state on load.
  if (currentParticipant) {
    rsvpForm.data.rsvp = currentParticipant.rsvp;
    rsvpForm.data.extraGuests = currentParticipant.extra_guests;
  }

  return {
    event: transformedEvent,
    participants: transformedParticipants,
    items: transformedItems,
    slots: transformedSlots,
    currentParticipant,
    currentUserId: userId ?? null,
    isHost: Boolean(isHost),
    form,
    editForm,
    deleteForm,
    rsvpForm,
    createSlotForm,
    editSlotForm,
    deleteSlotForm,
    claimSlotForm,
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

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1);

      if (!event) {
        return fail(404, {
          form,
          error: m.error_event_not_found(),
        });
      }

      const [participant] = await db
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.eventId, event.id),
            eq(participants.userId, userId),
          ),
        )
        .limit(1);
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
        dietaryTags: JSON.stringify(form.data.dietaryTags ?? []),
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

  setRsvp: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod4(rsvpSchema()));

    if (!form.valid) {
      return fail(400, { rsvpForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        rsvpForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const shareCode = params.code.toUpperCase();
      const userId = locals.user.id;

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1);

      if (!event) {
        return fail(404, { rsvpForm: form, error: m.error_event_not_found() });
      }

      // Resolve the caller's OWN participant row for this event. We never trust
      // a participant id from the client — we look it up from (event, user) so
      // a user can only ever target their own RSVP.
      const [participant] = await db
        .select({ id: participants.id })
        .from(participants)
        .where(
          and(
            eq(participants.eventId, event.id),
            eq(participants.userId, userId),
          ),
        )
        .limit(1);

      if (!participant) {
        return fail(404, {
          rsvpForm: form,
          error: m.error_rsvp_not_participant(),
        });
      }

      // updateRsvp re-checks ownership at the data layer as defence in depth.
      const result = await updateRsvp({
        participantId: participant.id,
        userId,
        data: { rsvp: form.data.rsvp, extraGuests: form.data.extraGuests },
      });

      if (!result.ok) {
        const status = result.reason === "not_found" ? 404 : 403;
        return fail(status, {
          rsvpForm: form,
          error:
            result.reason === "not_found"
              ? m.error_rsvp_not_participant()
              : m.error_rsvp_forbidden(),
        });
      }

      return { rsvpForm: form };
    } catch (err) {
      log("error", "Failed to update RSVP", { error: String(err) });
      return fail(500, {
        rsvpForm: form,
        error: m.error_rsvp_failed(),
      });
    }
  },

  editItem: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(editItemSchema()));

    if (!form.valid) {
      return fail(400, { editForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        editForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const result = await updateItem({
        itemId: Number(form.data.id),
        userId: locals.user.id,
        data: {
          name: form.data.name,
          category: form.data.category,
          quantity: form.data.quantity,
          dietaryTags: form.data.dietaryTags,
        },
      });

      if (!result.ok) {
        const status = result.reason === "not_found" ? 404 : 403;
        return fail(status, {
          editForm: form,
          error:
            result.reason === "not_found"
              ? m.error_item_not_found()
              : m.error_item_forbidden(),
        });
      }

      return { editForm: form };
    } catch (err) {
      log("error", "Failed to edit item", { error: String(err) });
      return fail(500, {
        editForm: form,
        error: m.error_edit_item_failed(),
      });
    }
  },

  deleteItem: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(deleteItemSchema()));

    if (!form.valid) {
      return fail(400, { deleteForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        deleteForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const result = await deleteItem({
        itemId: Number(form.data.id),
        userId: locals.user.id,
      });

      if (!result.ok) {
        const status = result.reason === "not_found" ? 404 : 403;
        return fail(status, {
          deleteForm: form,
          error:
            result.reason === "not_found"
              ? m.error_item_not_found()
              : m.error_item_forbidden(),
        });
      }

      return { deleteForm: form };
    } catch (err) {
      log("error", "Failed to delete item", { error: String(err) });
      return fail(500, {
        deleteForm: form,
        error: m.error_delete_item_failed(),
      });
    }
  },

  // ── Host wishlist / needed slots (issue #5) ───────────────────────────
  createSlot: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod4(createSlotSchema()));

    if (!form.valid) {
      return fail(400, { createSlotForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        createSlotForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const shareCode = params.code.toUpperCase();

      const [event] = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1);

      if (!event) {
        return fail(404, {
          createSlotForm: form,
          error: m.error_event_not_found(),
        });
      }

      // createSlot re-derives host ownership at the data layer; we never trust
      // the client's claim of being host.
      const result = await createSlot({
        eventId: event.id,
        userId: locals.user.id,
        data: {
          label: form.data.label,
          category: form.data.category ?? null,
          neededCount: form.data.neededCount,
        },
      });

      if (!result.ok) {
        const status = result.reason === "forbidden" ? 403 : 400;
        return fail(status, {
          createSlotForm: form,
          error:
            result.reason === "forbidden"
              ? m.error_slot_forbidden()
              : result.reason === "not_found"
                ? m.error_event_not_found()
                : m.error_slot_invalid(),
        });
      }

      return { createSlotForm: form };
    } catch (err) {
      log("error", "Failed to create slot", { error: String(err) });
      return fail(500, {
        createSlotForm: form,
        error: m.error_slot_failed(),
      });
    }
  },

  editSlot: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(editSlotSchema()));

    if (!form.valid) {
      return fail(400, { editSlotForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        editSlotForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const result = await updateSlot({
        slotId: Number(form.data.id),
        userId: locals.user.id,
        data: {
          label: form.data.label,
          category: form.data.category ?? null,
          neededCount: form.data.neededCount,
        },
      });

      if (!result.ok) {
        const status =
          result.reason === "not_found"
            ? 404
            : result.reason === "forbidden"
              ? 403
              : 400;
        return fail(status, {
          editSlotForm: form,
          error:
            result.reason === "not_found"
              ? m.error_slot_not_found()
              : result.reason === "forbidden"
                ? m.error_slot_forbidden()
                : m.error_slot_invalid(),
        });
      }

      return { editSlotForm: form };
    } catch (err) {
      log("error", "Failed to edit slot", { error: String(err) });
      return fail(500, {
        editSlotForm: form,
        error: m.error_slot_failed(),
      });
    }
  },

  deleteSlot: async ({ request, locals }) => {
    const form = await superValidate(request, zod4(deleteSlotSchema()));

    if (!form.valid) {
      return fail(400, { deleteSlotForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        deleteSlotForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const result = await deleteSlot({
        slotId: Number(form.data.id),
        userId: locals.user.id,
      });

      if (!result.ok) {
        const status =
          result.reason === "not_found"
            ? 404
            : result.reason === "forbidden"
              ? 403
              : 400;
        return fail(status, {
          deleteSlotForm: form,
          error:
            result.reason === "not_found"
              ? m.error_slot_not_found()
              : m.error_slot_forbidden(),
        });
      }

      return { deleteSlotForm: form };
    } catch (err) {
      log("error", "Failed to delete slot", { error: String(err) });
      return fail(500, {
        deleteSlotForm: form,
        error: m.error_slot_failed(),
      });
    }
  },

  claimSlot: async ({ request, params, locals }) => {
    const form = await superValidate(request, zod4(claimSlotSchema()));

    if (!form.valid) {
      return fail(400, { claimSlotForm: form });
    }

    if (!locals.user) {
      return fail(401, {
        claimSlotForm: form,
        error: m.error_session_invalid_join(),
      });
    }

    try {
      const shareCode = params.code.toUpperCase();
      const userId = locals.user.id;

      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.shareCode, shareCode))
        .limit(1);

      if (!event) {
        return fail(404, {
          claimSlotForm: form,
          error: m.error_event_not_found(),
        });
      }

      // Resolve (or lazily create) the caller's OWN participant row, exactly
      // like addItem — claiming makes you a participant if you weren't one.
      const [participant] = await db
        .select({ id: participants.id })
        .from(participants)
        .where(
          and(
            eq(participants.eventId, event.id),
            eq(participants.userId, userId),
          ),
        )
        .limit(1);

      let participantId: number;
      if (!participant) {
        const [newParticipant] = await db
          .insert(participants)
          .values({
            eventId: event.id,
            name: locals.user.name,
            userId,
            isHost: false,
          })
          .returning();
        participantId = newParticipant.id;
      } else {
        participantId = participant.id;
      }

      const result = await claimSlot({
        slotId: Number(form.data.id),
        participantId,
        data: { quantity: form.data.quantity },
      });

      if (!result.ok) {
        const status = result.reason === "not_found" ? 404 : 409;
        return fail(status, {
          claimSlotForm: form,
          error:
            result.reason === "not_found"
              ? m.error_slot_not_found()
              : m.error_slot_full(),
        });
      }

      return { claimSlotForm: form };
    } catch (err) {
      log("error", "Failed to claim slot", { error: String(err) });
      return fail(500, {
        claimSlotForm: form,
        error: m.error_slot_failed(),
      });
    }
  },
};
