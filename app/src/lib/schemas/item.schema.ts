import { z } from 'zod';

export const addItemSchema = z.object({
	name: z.string().min(1, "Le nom de l'item est requis"),
	category: z.enum(['apero', 'entree', 'plat', 'dessert', 'boissons', 'jeux', 'autre']).default('plat'),
	quantity: z.string().optional()
});

export type AddItemSchema = typeof addItemSchema;
