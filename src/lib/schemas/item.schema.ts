import { z } from "zod";
import * as m from "$lib/paraglide/messages";

export function addItemSchema() {
  return z.object({
    name: z.string().min(1, m.validation_item_name_required()),
    category: z
      .enum(["apero", "entree", "plat", "dessert", "boissons", "jeux", "autre"])
      .default("plat"),
    quantity: z.string().optional(),
  });
}

export type AddItemSchema = ReturnType<typeof addItemSchema>;
