import { z } from "zod";
import * as m from "$lib/paraglide/messages";

/**
 * A participant's RSVP update: their attendance status plus the number of
 * +1s they bring. `extraGuests` is clamped to a sane non-negative range so a
 * crafted request can't inject a negative or absurd headcount.
 */
export function rsvpSchema() {
  return z.object({
    rsvp: z.enum(["going", "maybe", "not"]).default("going"),
    extraGuests: z.coerce
      .number()
      .int(m.validation_extra_guests_invalid())
      .min(0, m.validation_extra_guests_invalid())
      .max(50, m.validation_extra_guests_invalid())
      .default(0),
  });
}

export type RsvpSchema = ReturnType<typeof rsvpSchema>;
