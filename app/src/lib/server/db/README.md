# Database Layer — Drizzle + PostgreSQL

**Architecture:** Drizzle ORM with PostgreSQL (orchestrated via Aspire)  
**Migration from:** PocketBase (SQLite) + JavaScript hooks

---

## 📁 Directory Structure

```
app/db/
├── schema.ts         # Drizzle table definitions (events, participants, items)
├── index.ts          # Database client singleton (connection pool)
├── migrate.ts        # Migration runner (pnpm tsx db/migrate.ts)
├── utils.ts          # Share code generation (ported from PocketBase hooks)
├── migrations/       # Generated SQL migration files (via drizzle-kit)
└── README.md         # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd app
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit tsx
```

### 2. Generate Migrations

```bash
pnpm drizzle-kit generate
```

This creates SQL files in `db/migrations/` based on `schema.ts`.

### 3. Start Aspire (with Postgres)

```bash
pnpm aspire start
```

This starts:

- PostgreSQL container
- SvelteKit app (connected to Postgres via Aspire)

### 4. Run Migrations

```bash
pnpm tsx db/migrate.ts
```

Applies migrations to Postgres database.

### 5. Verify Tables

```bash
# Get connection string from Aspire dashboard
psql <connection_string>

# List tables
\dt

# Verify schema
\d events
\d participants
\d items
```

---

## 📊 Schema

### **Events Table**

- `id` (serial) — Auto-increment primary key
- `name` (varchar 200) — Event name
- `date` (timestamp) — Event date/time
- `location` (varchar 500) — Optional location
- `description` (text) — Optional description
- `host_name` (varchar 100) — Host's display name
- `host_device_id` (varchar 100) — Device ID for anonymous auth
- `share_code` (varchar 8) — Unique join code (e.g., "ABC12345")
- `created_at`, `updated_at` — Timestamps

**Indexes:** `share_code`, `host_device_id`, `date`

### **Participants Table**

- `id` (serial) — Auto-increment primary key
- `event_id` (FK → events.id, cascade delete)
- `name` (varchar 100) — Participant's display name
- `device_id` (varchar 100) — Device ID for anonymous auth
- `is_host` (boolean) — Is this the event creator?
- `created_at`, `updated_at` — Timestamps

**Indexes:** `(event_id, device_id)`, `device_id`

### **Items Table**

- `id` (serial) — Auto-increment primary key
- `event_id` (FK → events.id, cascade delete)
- `participant_id` (FK → participants.id, cascade delete)
- `name` (varchar 100) — Item name
- `category` (varchar 32) — Category (apero, entree, plat, dessert, boissons, jeux, autre)
- `quantity` (varchar 32) — Optional quantity
- `created_at`, `updated_at` — Timestamps

**Indexes:** `event_id`, `participant_id`, `category`

---

## 🔧 Usage

### Import Database Client

```typescript
import { getDb } from "$lib/server/db"

const db = getDb()
```

### Query Examples

**Find event by share code:**

```typescript
import { getDb } from "$lib/server/db"
import { events } from "$lib/server/db/schema"
import { eq } from "drizzle-orm"

const db = getDb()
const event = await db.query.events.findFirst({
  where: eq(events.shareCode, "ABC123"),
  with: {
    participants: true,
    items: true,
  },
})
```

**Create event with auto-participant:**

```typescript
import { getDb } from "$lib/server/db"
import { events, participants } from "$lib/server/db/schema"
import { generateUniqueShareCode } from "$lib/server/db/utils"

const db = getDb()
const shareCode = await generateUniqueShareCode()

// Create event
const [event] = await db
  .insert(events)
  .values({
    name: "Summer BBQ",
    date: new Date("2026-07-15"),
    hostName: "Alice",
    hostDeviceId: "device-uuid-123",
    shareCode,
  })
  .returning()

// Auto-create host participant
await db.insert(participants).values({
  eventId: event.id,
  name: "Alice",
  deviceId: "device-uuid-123",
  isHost: true,
})
```

**Add item:**

```typescript
import { getDb } from "$lib/server/db"
import { items } from "$lib/server/db/schema"

const db = getDb()

await db.insert(items).values({
  eventId: 1,
  participantId: 1,
  name: "Grilled veggies",
  category: "plat",
  quantity: "2 platters",
})
```

---

## 🔐 Authentication

**Device-based authentication** (no accounts required):

1. Generate device ID in browser (UUID v4)
2. Store in localStorage: `popote_device_id`
3. Send in cookie or header for SSR
4. Use `device_id` to verify ownership:
   - Update/delete events: check `host_device_id`
   - Update/delete items: check participant's `device_id`

---

## 🔄 Migrations

### Generate Migration

After modifying `schema.ts`:

```bash
pnpm drizzle-kit generate
```

### Run Migration

```bash
pnpm tsx db/migrate.ts
```

### Rollback (Manual)

Drizzle doesn't support automatic rollback. To rollback:

1. Edit migration file (use the `down` function if available)
2. Or manually write revert SQL and run via `psql`

---

## 🧪 Testing

**Unit tests for share code generation:**

```typescript
import { describe, it, expect } from "vitest"
import { generateUniqueShareCode, isValidShareCode } from "$lib/server/db/utils"

describe("Share Code Utils", () => {
  it("generates valid 6-char code", async () => {
    const code = await generateUniqueShareCode()
    expect(code).toMatch(/^[A-Z0-9]{6}$/)
  })

  it("validates share code format", () => {
    expect(isValidShareCode("ABC123")).toBe(true)
    expect(isValidShareCode("abc123")).toBe(false)
    expect(isValidShareCode("AB12")).toBe(false)
  })
})
```

---

## 🚨 Common Issues

### Issue: "Database connection string not found"

**Cause:** Aspire not running or `ConnectionStrings__popotedb` not set.

**Fix:**

1. Start Aspire: `pnpm aspire start`
2. Check Aspire dashboard for connection string
3. Verify `.withReference(db)` in `apphost.ts`

### Issue: "relation 'events' does not exist"

**Cause:** Migrations not run.

**Fix:**

```bash
pnpm tsx db/migrate.ts
```

### Issue: "Failed to generate unique share code"

**Cause:** Too many collisions (unlikely with 6-char codes).

**Fix:**

- Check database for duplicate `share_code` values
- Increase code length to 8 characters in `db/utils.ts`

---

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Aspire Postgres Integration](https://aspire.dev/docs/hosting/postgres/)

---

**Status:** ✅ Complete — Dependencies installed, migrations generated, API routes implemented  
**Next:** Start Aspire → Run migrations → Test API endpoints
