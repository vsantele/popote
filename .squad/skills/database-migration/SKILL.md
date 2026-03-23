# Skill: Database Migration Patterns (Drizzle ORM)

**Purpose:** Reusable patterns for migrating from one database technology to another while preserving business logic and data model integrity.

**When to use:**
- Migrating from one ORM/database to another
- Pivoting technology stack while preserving product requirements
- Translating schema definitions between technologies

---

## Pattern: Schema Translation Checklist

When migrating database schemas, follow this checklist:

### 1. Map Data Types

| Source | Target | Notes |
|--------|--------|-------|
| String/Text | `text()` | No length limits in Postgres |
| Integer | `integer()` | |
| Boolean | `boolean()` | |
| Date/DateTime | `timestamp({ withTimezone: true })` | Always use timezone-aware timestamps |
| UUID | `uuid().defaultRandom()` | Use Postgres native UUID generation |
| Fixed-length string | `char('field', { length: N })` | For codes, IDs with exact length |

### 2. Preserve Relationships

- **Foreign Keys:** Map to `.references(() => table.id, { onDelete: 'cascade' })`
- **One-to-Many:** Define relations with `relations()` for query expansion
- **Cascade Deletes:** Always preserve cascade behavior if it existed

### 3. Validate Constraints

- **Unique constraints:** `.unique()` on fields
- **Not null:** `.notNull()` on required fields
- **Defaults:** `.default(value)` or `.defaultNow()` for timestamps
- **Enums:** Use Zod schemas for validation (more flexible than DB enums)

### 4. Index Strategy

Start without indexes for MVP. Add later if:
- Queries are slow (>100ms)
- Filtering by specific fields is common
- Unique lookups need optimization

---

## Pattern: Business Logic Migration

### 1. Identify Logic Locations

**From:** Server hooks, stored procedures, ORM middleware  
**To:** Server-side utilities, API route handlers, Zod schemas

**Example:**
```javascript
// OLD: PocketBase hook
onRecordCreateRequest((e) => {
  const shareCode = generateShareCode();
  record.set('share_code', shareCode);
}, 'events');

// NEW: SvelteKit server action
const shareCode = await ensureUniqueShareCode(db);
await db.insert(events).values({ ...data, shareCode });
```

### 2. Extract Validation Logic

**From:** Database constraints, hook validation  
**To:** Zod schemas (single source of truth)

**Example:**
```typescript
// Zod schema replaces both DB constraints and hook validation
export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['apero', 'entree', 'plat', 'dessert', 'boissons', 'jeux', 'autre']),
  quantity: z.string().max(100).optional(),
});
```

### 3. Map Transaction Patterns

**From:** Implicit transactions (hooks)  
**To:** Explicit transactions (ORM API)

**Example:**
```typescript
await db.transaction(async (tx) => {
  const [event] = await tx.insert(events).values(eventData).returning();
  await tx.insert(participants).values({
    eventId: event.id,
    name: hostName,
    isHost: true,
  });
});
```

---

## Pattern: Risk Mitigation

### Common Risks in Database Migrations

| Risk | Mitigation |
|------|------------|
| **Type mismatches** | Use TypeScript inference from schema (`typeof table.$inferSelect`) |
| **Missing constraints** | Document all constraints in Zod schemas |
| **Performance regression** | Benchmark queries before/after migration |
| **Data loss** | Never delete old database until new one is validated |
| **Connection pooling** | Use connection pooling for serverless deployments |

---

## Pattern: Migration Testing

```typescript
// tests/db/migration.test.ts

describe('Schema Migration', () => {
  it('preserves data integrity', async () => {
    // 1. Create record in old database
    const oldEvent = await oldDb.createEvent({ ... });
    
    // 2. Export data
    const exported = await exportData();
    
    // 3. Import to new database
    await importData(newDb, exported);
    
    // 4. Verify data is identical
    const newEvent = await newDb.query.events.findFirst({ ... });
    expect(newEvent.name).toBe(oldEvent.name);
    expect(newEvent.shareCode).toBe(oldEvent.shareCode);
  });
});
```

---

## Reusable Code Snippets

### Share Code Generation (TypeScript)

```typescript
export function generateShareCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function ensureUniqueShareCode(
  db: Database,
  maxAttempts = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateShareCode();
    const existing = await db
      .select()
      .from(events)
      .where(eq(events.shareCode, code))
      .limit(1);
    
    if (existing.length === 0) return code;
  }
  throw new Error('Failed to generate unique share code');
}
```

### Device ID Management (Browser)

```typescript
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''; // SSR guard
  
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}
```

---

## Checklist for Database Migrations

- [ ] Map all tables/collections to new schema
- [ ] Preserve foreign key relationships and cascade behavior
- [ ] Translate all constraints (unique, not null, defaults)
- [ ] Extract business logic from hooks/triggers to application layer
- [ ] Define validation schemas (Zod or similar)
- [ ] Test transactions (especially multi-step operations)
- [ ] Benchmark query performance
- [ ] Document migration risks and mitigations
- [ ] Create rollback plan
- [ ] Version-control migrations (don't generate on-the-fly)

---

**When NOT to use this pattern:**
- If old database is working fine (don't migrate for no reason)
- If new database doesn't provide meaningful benefits
- If migration timeline exceeds product validation timeline

---

**Success Criteria:**
- All data model concepts preserved
- Business logic produces identical results
- Performance is equal or better
- Type safety improved (if migrating to TypeScript)
