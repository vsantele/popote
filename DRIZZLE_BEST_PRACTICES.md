# Drizzle ORM Best Practices Reference

Quick reference guide for maintaining code quality with Drizzle ORM in this project.

---

## 🎯 Quick Rules

### 1. Always Use Transactions for Multi-Table Operations

**❌ BAD**:

```typescript
const [event] = await db.insert(events).values({...}).returning();
await db.insert(participants).values({ eventId: event.id, ... });  // Could fail!
```

**✅ GOOD**:

```typescript
await db.transaction(async (tx) => {
  const [event] = await tx.insert(events).values({...}).returning();
  await tx.insert(participants).values({ eventId: event.id, ... });
});
```

---

### 2. Use Relational Query API (Not Manual Joins)

**❌ BAD** (N+1 queries):

```typescript
const event = await db.select().from(events).where(eq(events.id, id));
const participants = await db
  .select()
  .from(participants)
  .where(eq(participants.eventId, id));
const items = await db.select().from(items).where(eq(items.eventId, id));
```

**✅ GOOD** (1 query):

```typescript
const event = await db.query.events.findFirst({
  where: eq(events.id, id),
  with: {
    participants: true,
    items: true,
  },
});
```

---

### 3. Use `integer()` for Foreign Keys (Not `serial()`)

**❌ BAD**:

```typescript
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  eventId: serial("event_id") // ❌ Wrong - creates unnecessary sequence
    .references(() => events.id),
});
```

**✅ GOOD**:

```typescript
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id") // ✅ Correct
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
});
```

---

### 4. Use `.$onUpdate()` for Timestamps (Not Manual)

**❌ BAD** (manual everywhere):

```typescript
// Schema
updatedAt: (timestamp("updated_at").notNull().defaultNow(),
  // Every insert/update
  await db.insert(items).values({
    name: "Item",
    updatedAt: new Date(), // ❌ Easy to forget
  }));
```

**✅ GOOD** (automatic):

```typescript
// Schema
updatedAt: (timestamp("updated_at")
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date()), // ✅ Automatic
  // Insert/update (no manual timestamp needed)
  await db.insert(items).values({
    name: "Item",
    // updatedAt handled automatically
  }));
```

---

### 5. Always Define Relations for Relational Queries

**❌ BAD** (no relations):

```typescript
export const events = pgTable("events", { ... });
export const participants = pgTable("participants", { ... });
// No relations defined - can't use relational query API
```

**✅ GOOD** (with relations):

```typescript
export const events = pgTable("events", { ... });
export const participants = pgTable("participants", { ... });

export const eventsRelations = relations(events, ({ many }) => ({
  participants: many(participants),
  items: many(items),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  event: one(events, {
    fields: [participants.eventId],
    references: [events.id],
  }),
  items: many(items),
}));
```

---

## 📋 Common Patterns

### Pattern 1: Create Entity with Related Data

```typescript
// Event + Host Participant
await db.transaction(async (tx) => {
  const [event] = await tx.insert(events).values({...}).returning();
  const [host] = await tx.insert(participants).values({
    eventId: event.id,
    isHost: true,
    ...hostData,
  }).returning();
  return { event, host };
});
```

### Pattern 2: Load Entity with All Relations

```typescript
// Load event with participants and items
const event = await db.query.events.findFirst({
  where: eq(events.shareCode, shareCode),
  with: {
    participants: true,
    items: true,
  },
});
```

### Pattern 3: Conditional Relation Loading

```typescript
// Load event with only specific participant
const event = await db.query.events.findFirst({
  where: eq(events.shareCode, shareCode),
  with: {
    participants: {
      where: (participants, { eq }) => eq(participants.deviceId, deviceId),
    },
  },
});
```

### Pattern 4: Update with Automatic Timestamp

```typescript
// updatedAt is automatically set
await db.update(events).set({ name: "New Name" }).where(eq(events.id, id));
```

---

## 🚨 Common Mistakes to Avoid

### Mistake 1: Not Using Transactions

```typescript
// ❌ If second insert fails, you have orphaned event
const [event] = await db.insert(events).values({...}).returning();
await db.insert(participants).values({...});
```

### Mistake 2: Manual Joins Instead of Relational API

```typescript
// ❌ Verbose and multiple queries
const events = await db.select().from(events);
const participants = await db.select().from(participants);
const combined = events.map((event) => ({
  ...event,
  participants: participants.filter((p) => p.eventId === event.id),
}));

// ✅ Use relational API instead
const events = await db.query.events.findMany({
  with: { participants: true },
});
```

### Mistake 3: Forgetting CASCADE on Foreign Keys

```typescript
// ❌ Orphaned records when parent deleted
eventId: integer("event_id").references(() => events.id);

// ✅ Automatically delete children
eventId: integer("event_id")
  .notNull()
  .references(() => events.id, { onDelete: "cascade" });
```

### Mistake 4: Using Wrong Column Types

```typescript
// ❌ Wrong types
eventId: serial("event_id"); // Creates unnecessary sequence
createdAt: varchar("created_at"); // Should be timestamp

// ✅ Correct types
eventId: integer("event_id");
createdAt: timestamp("created_at", { withTimezone: true });
```

---

## 🔍 How to Check Your Code

### Checklist for New Queries:

- [ ] Am I using `db.query.X.findFirst/findMany`? (relational API)
- [ ] Do I need related data? Use `with: { ... }`
- [ ] Am I inserting into multiple tables? Use `transaction`
- [ ] Do I need to manually set `updatedAt`? (No, it's automatic)

### Checklist for New Schema Tables:

- [ ] Primary key is `serial("id")`
- [ ] Foreign keys are `integer("..._id")`
- [ ] Foreign keys have `onDelete: "cascade"` if needed
- [ ] Timestamps have `.$onUpdate(() => new Date())`
- [ ] Relations are defined for both directions

---

## 📚 Further Reading

- [Drizzle Transactions](https://orm.drizzle.team/docs/transactions)
- [Drizzle Relational Queries](https://orm.drizzle.team/docs/rqb)
- [Drizzle PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)
- [Drizzle Relations](https://orm.drizzle.team/docs/relations)

---

## 🎯 Project-Specific Conventions

### Database Naming:

- Tables: plural, lowercase (events, participants, items)
- Columns: camelCase in code, snake_case in database
- Foreign keys: `[tableName]Id` in code, `[table_name]_id` in database

### Always Use:

- `getDb()` to get database instance (singleton pattern)
- `closeDb()` for graceful shutdown
- Drizzle-kit for migrations: `npx drizzle-kit generate`

### File Structure:

```
app/src/lib/server/db/
├── index.ts          # Database connection + query helpers
├── schema.ts         # Table definitions + relations
├── utils.ts          # Utility functions (code generation)
├── migrate.ts        # Migration runner
└── migrations/       # Generated SQL migrations
```

---

**Remember**: When in doubt, check existing patterns in the codebase!
