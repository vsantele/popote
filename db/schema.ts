import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "void/schema-d1";
import { relations } from "drizzle-orm";
import { sql } from "void/db";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username", { length: 255 }).unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  isAnonymous: integer("is_anonymous", { mode: "boolean" })
    .default(false)
    .notNull(),
  role: text("role"),
  banned: integer("banned"),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer().primaryKey({ autoIncrement: true }).primaryKey(),
    name: text("name", { length: 200 }).notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),
    location: text("location", { length: 500 }),
    description: text("description"),
    hostName: text("host_name", { length: 100 }).notNull(),
    hostUserId: text("host_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    index("events_host_user_id_idx").on(table.hostUserId),
    index("events_date_idx").on(table.date),
  ],
);

export const participants = sqliteTable(
  "participants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name", { length: 100 }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isHost: integer("is_host", { mode: "boolean" }).notNull().default(false),
    // RSVP status: "going" (confirmed), "maybe" (tentative), "not" (declined).
    // Defaults to "going" so existing participants — who joined by adding
    // something — keep counting toward the headcount after the migration.
    rsvp: text("rsvp", { enum: ["going", "maybe", "not"] })
      .notNull()
      .default("going"),
    // The participant's +1s: how many extra guests they bring (never negative).
    extraGuests: integer("extra_guests").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("participants_event_user_idx").on(table.eventId, table.userId),
    index("participants_user_id_idx").on(table.userId),
  ],
);

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
    dietaryTags: text("dietary_tags").default("[]").notNull(),
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

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // The browser PushSubscription endpoint URL. Globally unique: a device's
    // subscription is identified by its endpoint, so we upsert on it to keep
    // storage idempotent (re-subscribing the same device never duplicates).
    endpoint: text("endpoint").notNull().unique(),
    // Encryption material from the PushSubscription (RFC 8291). `p256dh` is the
    // client's public key (b64url), `auth` is the shared auth secret (b64url).
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    // Who owns this subscription. Tied to the auth user so we can target
    // reminders per participant/device and clean up on opt-out.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Optional: scope a subscription to a specific event. When null the
    // subscription is account-wide. When set, reminders fire for that event.
    eventId: integer("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("push_subscriptions_user_id_idx").on(table.userId),
    index("push_subscriptions_event_id_idx").on(table.eventId),
  ],
);

// Tracks which (event, subscription) reminders have already been sent so the
// T-24h cron is idempotent and never double-notifies the same device.
export const sentReminders = sqliteTable(
  "sent_reminders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    // Reminder kind, e.g. "t24h". Lets us add other reminder types later
    // without colliding on the uniqueness guard.
    kind: text("kind").notNull().default("t24h"),
    sentAt: integer("sent_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
  },
  (table) => [
    // One reminder of a given kind per (event, subscription): the cron uses
    // this to skip devices it already notified, and the UNIQUE constraint is
    // the last line of defence against a double-send under a race.
    uniqueIndex("sent_reminders_unique_idx").on(
      table.eventId,
      table.subscriptionId,
      table.kind,
    ),
  ],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  participants: many(participants),
  items: many(items),
  hostUser: one(user, {
    fields: [events.hostUserId],
    references: [user.id],
  }),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    event: one(events, {
      fields: [participants.eventId],
      references: [events.id],
    }),
    user: one(user, {
      fields: [participants.userId],
      references: [user.id],
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

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  hostedEvents: many(events),
  participations: many(participants),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const RSVP_STATUSES = ["going", "maybe", "not"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];

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
