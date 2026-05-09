import { z } from "zod";
import * as m from "$lib/paraglide/messages";

export function createEventSchema() {
  return z.object({
    name: z.string().min(1, m.validation_event_name_required()),
    date: z.string().min(1, m.validation_date_required()),
    location: z.string().optional(),
    description: z.string().optional(),
    host_name: z.string().min(1, m.validation_name_required()),
  });
}

export type CreateEventSchema = ReturnType<typeof createEventSchema>;
