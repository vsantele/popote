import { sqliteTable, text, integer, index } from "void/schema-d1";
import { relations } from "drizzle-orm";
import { sql } from "void/db";
/**
 * Events table - Core event/party entity
 *
 * - share_code generation now handled by trigger or application logic
 * - host_device_id used for anonymous authentication
 */
export const events = sqliteTable(
  "events",
  {
    id: integer().primaryKey({ autoIncrement: true }).primaryKey(),
    name: text("name", { length: 200 }).notNull(),
    date: text("date", {}).notNull(),
    location: text("location", { length: 500 }),
    description: text("description"),
    hostName: text("host_name", { length: 100 }).notNull(),
    hostDeviceId: text("host_device_id", { length: 100 }).notNull(),
    // Share code: 6-8 character alphanumeric for joining event
    shareCode: text("share_code", { length: 8 }).notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .$onUpdate(() => new Date()),
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
 * - device_id is the anonymous auth key (no accounts required)
 * - is_host flag identifies the event creator
 * - Cascade delete: removing event removes all participants
 */
export const participants = sqliteTable(
  "participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name", { length: 100 }).notNull(),
    deviceId: text("device_id", { length: 100 }).notNull(),
    isHost: integer("is_host", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("participants_event_device_idx").on(table.eventId, table.deviceId),
    index("participants_device_id_idx").on(table.deviceId),
  ],
);

/**
 * Items table - Things participants bring
 *
 * - Categories: apero, entree, plat, dessert, boissons, jeux, autre
 * - Cascade delete: removing event removes all items
 */
export const items = sqliteTable(
  "items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participantId: integer("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    name: text("name", { length: 100 }).notNull(),
    category: text("category", { length: 32 }).notNull(),
    quantity: text("quantity", { length: 32 }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .$onUpdate(() => new Date()),
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
export const syncCodes = sqliteTable(
  "sync_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).primaryKey(),
    code: text("code", { length: 8 }).notNull().unique(),
    deviceId: text("device_id", { length: 100 }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
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
