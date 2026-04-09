import { z } from "zod";

export const createEventSchema = z.object({
  name: z.string().min(1, "Le nom de la soirée est requis"),
  date: z.string().min(1, "La date est requise"),
  location: z.string().optional(),
  description: z.string().optional(),
  host_name: z.string().min(1, "Votre nom est requis"),
});

export type CreateEventSchema = typeof createEventSchema;
