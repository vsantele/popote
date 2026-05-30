import { z } from "zod";
import * as m from "$lib/paraglide/messages";
import { VALID_DIETARY_TAGS } from "$lib/types/index";

const DIETARY_TAG_ENUM = VALID_DIETARY_TAGS as unknown as [
  string,
  ...string[],
];

export function addItemSchema() {
  return z.object({
    name: z.string().min(1, m.validation_item_name_required()),
    category: z
      .enum(["apero", "entree", "plat", "dessert", "boissons", "jeux", "autre"])
      .default("plat"),
    quantity: z.string().optional(),
    dietaryTags: z.array(z.enum(DIETARY_TAG_ENUM)).default([]),
  });
}

export type AddItemSchema = ReturnType<typeof addItemSchema>;

export function editItemSchema() {
  return z.object({
    id: z.string().min(1),
    name: z.string().min(1, m.validation_item_name_required()),
    category: z
      .enum(["apero", "entree", "plat", "dessert", "boissons", "jeux", "autre"])
      .default("plat"),
    quantity: z.string().optional(),
    dietaryTags: z.array(z.enum(DIETARY_TAG_ENUM)).default([]),
  });
}

export type EditItemSchema = ReturnType<typeof editItemSchema>;

export function deleteItemSchema() {
  return z.object({
    id: z.string().min(1),
  });
}

export type DeleteItemSchema = ReturnType<typeof deleteItemSchema>;
