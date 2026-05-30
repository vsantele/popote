// Data models for Popote application

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
