// Data models for Popote application

export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "contains-nuts"
  | "lactose-free"
  | "halal"
  | "kosher"
  | "spicy";

export interface Event {
  id: string;
  name: string;
  date: string; // ISO 8601
  location?: string;
  description?: string;
  host_name: string;
  host_device_id: string;
  share_code: string;
  created: string; // ISO 8601
}

export interface Participant {
  id: string;
  event: string; // FK to Event
  name: string;
  device_id: string;
  is_host: boolean;
  created: string;
}

export interface Item {
  id: string;
  event: string; // FK to Event
  participant: string; // FK to Participant
  name: string;
  category: ItemCategory;
  quantity?: string;
  dietary_tags: DietaryTag[];
  created: string;
}

export type ItemCategory =
  | "apero"
  | "entree"
  | "plat"
  | "dessert"
  | "boissons"
  | "jeux"
  | "autre";

/**
 * A host-defined "needed slot" (issue #5) as surfaced to the page: a label,
 * an optional category, how many contributions are needed, and how many are
 * already claimed / still open (derived server-side).
 */
export interface EventSlot {
  id: string;
  label: string;
  category?: ItemCategory;
  needed_count: number;
  claimed_count: number;
  open_count: number;
}

import * as m from "$lib/paraglide/messages";

export const CATEGORIES: Record<
  ItemCategory,
  { emoji: string; label: () => string; color: string }
> = {
  apero: { emoji: "🥂", label: m.category_apero, color: "var(--cat-apero)" },
  entree: { emoji: "🥗", label: m.category_entree, color: "var(--cat-entree)" },
  plat: { emoji: "🍖", label: m.category_plat, color: "var(--cat-plat)" },
  dessert: {
    emoji: "🍰",
    label: m.category_dessert,
    color: "var(--cat-dessert)",
  },
  boissons: {
    emoji: "🍷",
    label: m.category_boissons,
    color: "var(--cat-boissons)",
  },
  jeux: { emoji: "🎲", label: m.category_jeux, color: "var(--cat-jeux)" },
  autre: { emoji: "📦", label: m.category_autre, color: "var(--cat-autre)" },
};

export const CATEGORY_ORDER: ItemCategory[] = [
  "apero",
  "entree",
  "plat",
  "dessert",
  "boissons",
  "jeux",
  "autre",
];

export const VALID_DIETARY_TAGS = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "contains-nuts",
  "lactose-free",
  "halal",
  "kosher",
  "spicy",
] as const satisfies DietaryTag[];

export const DIETARY_TAGS: Record<
  DietaryTag,
  { emoji: string; label: () => string }
> = {
  vegetarian: { emoji: "🌱", label: m.tag_vegetarian },
  vegan: { emoji: "🥦", label: m.tag_vegan },
  "gluten-free": { emoji: "🌾", label: m.tag_gluten_free },
  "contains-nuts": { emoji: "🥜", label: m.tag_contains_nuts },
  "lactose-free": { emoji: "🥛", label: m.tag_lactose_free },
  halal: { emoji: "☪️", label: m.tag_halal },
  kosher: { emoji: "✡️", label: m.tag_kosher },
  spicy: { emoji: "🌶️", label: m.tag_spicy },
};
