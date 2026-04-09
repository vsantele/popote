import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Events table - Core event/party entity
 *
 * Migration from PocketBase:
 * - Replaces PocketBase "events" collection
 * - share_code generation now handled by trigger or application logic
 * - host_device_id used for anonymous authentication
 */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 500 }),
    description: text("description"),
    hostName: varchar("host_name", { length: 100 }).notNull(),
    hostDeviceId: varchar("host_device_id", { length: 100 }).notNull(),
    // Share code: 6-8 character alphanumeric for joining event
    shareCode: varchar("share_code", { length: 8 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("events_share_code_idx").on(table.shareCode),
    index("events_host_device_id_idx").on(table.hostDeviceId),
    index("events_date_idx").on(table.date),
  ],
);

/**
 * Participants table - Links users to events
 *
 * Migration from PocketBase:
 * - Replaces PocketBase "participants" collection
 * - device_id is the anonymous auth key (no accounts required)
 * - is_host flag identifies the event creator
 * - Cascade delete: removing event removes all participants
 */
export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
    eventId: serial("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    deviceId: varchar("device_id", { length: 100 }).notNull(),
    isHost: boolean("is_host").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participants_event_device_idx").on(table.eventId, table.deviceId),
    index("participants_device_id_idx").on(table.deviceId),
  ],
);

/**
 * Items table - Things participants bring
 *
 * Migration from PocketBase:
 * - Replaces PocketBase "items" collection
 * - Categories: apero, entree, plat, dessert, boissons, jeux, autre
 * - Cascade delete: removing event removes all items
 */
export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    eventId: serial("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participantId: serial("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    // Category enum matching PocketBase
    category: varchar("category", { length: 32 }).notNull(),
    quantity: varchar("quantity", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("items_event_id_idx").on(table.eventId),
    index("items_participant_id_idx").on(table.participantId),
    index("items_category_idx").on(table.category),
  ],
);

/**
 * Sync Codes table - Temporary codes for transferring device IDs
 *
 * - code: 6-character alphanumeric code
 * - device_id: the identity to be transferred
 * - expires_at: 10-15 min expiration
 */
export const syncCodes = pgTable(
  "sync_codes",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 8 }).notNull().unique(),
    deviceId: varchar("device_id", { length: 100 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("sync_codes_code_idx").on(table.code),
    index("sync_codes_device_id_idx").on(table.deviceId),
  ],
);

// Relations for Drizzle query API
export const eventsRelations = relations(events, ({ many }) => ({
  participants: many(participants),
  items: many(items),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    event: one(events, {
      fields: [participants.eventId],
      references: [events.id],
    }),
    items: many(items),
  }),
);

export const itemsRelations = relations(items, ({ one }) => ({
  event: one(events, {
    fields: [items.eventId],
    references: [events.id],
  }),
  participant: one(participants, {
    fields: [items.participantId],
    references: [participants.id],
  }),
}));

// Valid categories (enum for validation)
export const VALID_CATEGORIES = [
  "apero",
  "entree",
  "plat",
  "dessert",
  "boissons",
  "jeux",
  "autre",
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];
