import { z } from "zod";
import * as m from "$lib/paraglide/messages";

// A slot's category reuses the item categories, but is OPTIONAL: a need like
// "ice" or "plates" has no course. An empty string from the form is coerced to
// undefined so it round-trips as a null category.
const SLOT_CATEGORY = z
  .enum(["apero", "entree", "plat", "dessert", "boissons", "jeux", "autre"])
  .optional();

/**
 * Host creates a needed slot: a label, an optional category, and how many
 * contributions are needed (clamped to a sane [1, 99] range so a crafted
 * request can't seed an absurd count).
 */
export function createSlotSchema() {
  return z.object({
    label: z.string().min(1, m.validation_slot_label_required()),
    category: SLOT_CATEGORY,
    neededCount: z.coerce
      .number()
      .int(m.validation_slot_count_invalid())
      .min(1, m.validation_slot_count_invalid())
      .max(99, m.validation_slot_count_invalid())
      .default(1),
  });
}

export type CreateSlotSchema = ReturnType<typeof createSlotSchema>;

/** Host edits an existing slot. Same fields plus the target slot id. */
export function editSlotSchema() {
  return z.object({
    id: z.string().min(1),
    label: z.string().min(1, m.validation_slot_label_required()),
    category: SLOT_CATEGORY,
    neededCount: z.coerce
      .number()
      .int(m.validation_slot_count_invalid())
      .min(1, m.validation_slot_count_invalid())
      .max(99, m.validation_slot_count_invalid())
      .default(1),
  });
}

export type EditSlotSchema = ReturnType<typeof editSlotSchema>;

/** Host deletes a slot. */
export function deleteSlotSchema() {
  return z.object({
    id: z.string().min(1),
  });
}

export type DeleteSlotSchema = ReturnType<typeof deleteSlotSchema>;

/** A guest claims an open slot, optionally noting a quantity. */
export function claimSlotSchema() {
  return z.object({
    id: z.string().min(1),
    quantity: z.string().optional(),
  });
}

export type ClaimSlotSchema = ReturnType<typeof claimSlotSchema>;
