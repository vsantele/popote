# Migration Plan: Flutter+PocketBase → SvelteKit+Drizzle+Postgres

**Date:** 2026-03-22  
**Author:** Ripley (Lead)  
**Status:** In Planning  

---

## Executive Summary

Victor pivoted the project from Flutter + PocketBase to SvelteKit + Drizzle ORM + Postgres (orchestrated via Aspire). The Flutter+PocketBase stack was too heavy for this simple MVP. This document maps what we're leaving behind, what transfers conceptually, and key architectural decisions for the new stack.

**Reason for Pivot:** Mobile-first PWA with SvelteKit is lighter, faster to iterate, and aligns better with the "everywhere access" goal. Postgres + Drizzle provides better type safety and migration tooling than PocketBase.

---

## 1. What We're Leaving Behind

### 1.1 Flutter Mobile App (`old/popote_app/`)

**What was built:**
- Full Dart/Flutter app with Riverpod state management
- Device-based anonymous auth (UUID stored in SharedPreferences)
- Screens: Home, Event Creation, Event Detail, Add Item
- Models: Event, Participant, Item (with JSON serialization)
- Real-time sync via PocketBase SSE wrapped in StreamProvider
- Deep linking support (GoRouter) for share codes

**Why abandoning:**
- Mobile-only targets iOS/Android (no web without additional work)
- Heavier development cycle (compile times, platform-specific builds)
- Requires app store distribution for deep linking to work reliably
- Victor's goal is PWA for "everywhere access" — SvelteKit delivers this natively

**What NOT to salvage:**
- Dart models (will rewrite as TypeScript interfaces)
- Riverpod providers (SvelteKit has its own state patterns)
- Flutter-specific UI code (will use shadcn-svelte components)
- Deep linking setup (PWA uses standard URLs, no platform config needed)

---

### 1.2 PocketBase Backend (`old/backend/`)

**What was built:**
- Complete schema: `events`, `participants`, `items` collections
- JavaScript hooks for:
  - Share code generation (6-char alphanumeric, unique with retry logic)
  - Auto-creation of host participant on event creation
  - Category validation for items
  - Event validation (host name, device ID, date checks)
- Real-time SSE support for live updates
- Cascade delete (deleting event removes participants and items)

**Why abandoning:**
- PocketBase is SQLite-based, lacks type safety with TypeScript
- JS hooks are not type-safe (no IntelliSense)
- Real-time via SSE is good but Postgres + WebSockets or polling is more standard
- Drizzle ORM provides better schema evolution (migrations as code)

**What NOT to salvage:**
- PocketBase executable and pb_data directory
- JavaScript hooks (will rewrite as SvelteKit server actions or API routes)
- SQLite database (migrating to Postgres)

---

## 2. What Concepts Transfer to New Stack

### 2.1 Data Model (Core Schema)

✅ **FULLY TRANSFERS** — The data model is sound and well-designed.

**Collections → Tables:**

| PocketBase Collection | Postgres Table | Notes |
|-----------------------|----------------|-------|
| `events` | `events` | Same fields, same relationships |
| `participants` | `participants` | Same fields, same relationships |
| `items` | `items` | Same fields, same relationships |

**Schema mapping:**

```typescript
// events table (Drizzle schema)
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  date: timestamp('date').notNull(),
  location: text('location'),
  description: text('description'),
  hostName: text('host_name').notNull(),
  hostDeviceId: text('host_device_id').notNull(),
  shareCode: char('share_code', { length: 6 }).unique().notNull(),
  created: timestamp('created').defaultNow().notNull(),
});

// participants table
export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  deviceId: text('device_id').notNull(),
  isHost: boolean('is_host').default(false),
  created: timestamp('created').defaultNow().notNull(),
});

// items table
export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  participantId: uuid('participant_id').references(() => participants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(), // enum: apero, entree, plat, dessert, boissons, jeux, autre
  quantity: text('quantity'),
  created: timestamp('created').defaultNow().notNull(),
});
```

**Key decisions:**
- Use `uuid` for IDs (Postgres standard, better than PocketBase's 15-char strings)
- Use `timestamp` for dates (Postgres native type)
- Use `text` for strings (Postgres best practice, no arbitrary length limits)
- Use `char(6)` for share_code (enforces length)
- Cascade deletes preserved (onDelete: 'cascade')

---

### 2.2 Business Logic Patterns

✅ **TRANSFERS WITH ADAPTATION** — Logic is sound, needs rewriting in TypeScript.

**Pattern 1: Share Code Generation**

```typescript
// PocketBase hook → SvelteKit server action
// old/backend/pb_hooks/main.pb.js (lines 6-44)

// NEW: lib/server/share-codes.ts
export function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function ensureUniqueShareCode(db: Database): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateShareCode();
    const existing = await db.select().from(events).where(eq(events.shareCode, code)).limit(1);
    if (existing.length === 0) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique share code');
}
```

**Pattern 2: Host Participant Auto-Creation**

```typescript
// PocketBase hook → SvelteKit transaction
// old/backend/pb_hooks/main.pb.js (lines 78-97)

// NEW: In event creation action
const shareCode = await ensureUniqueShareCode(db);

await db.transaction(async (tx) => {
  // Create event
  const [event] = await tx.insert(events).values({
    name, date, location, description, hostName, hostDeviceId, shareCode,
  }).returning();

  // Auto-create host participant
  await tx.insert(participants).values({
    eventId: event.id,
    name: hostName,
    deviceId: hostDeviceId,
    isHost: true,
  });
});
```

**Pattern 3: Category Validation**

```typescript
// PocketBase hook → Zod schema validation
// old/backend/pb_hooks/main.pb.js (lines 99-140)

// NEW: lib/schemas/item.ts
export const categories = [
  'apero', 'entree', 'plat', 'dessert', 'boissons', 'jeux', 'autre'
] as const;

export type Category = typeof categories[number];

export const itemSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(categories),
  quantity: z.string().max(100).optional(),
});
```

---

### 2.3 User Flows (UX Patterns)

✅ **FULLY TRANSFERS** — These are product requirements, stack-agnostic.

| Flow | Flutter Implementation | SvelteKit Implementation |
|------|------------------------|-------------------------|
| Create event | Form → Riverpod FutureProvider → PocketBase API | Form → SvelteKit form action → Drizzle insert |
| Join event | Deep link → GoRouter → SharedPreferences device ID | URL param → SvelteKit load → localStorage device ID |
| Add item | Form → Riverpod FutureProvider → PocketBase API | Form → SvelteKit form action → Drizzle insert |
| Real-time sync | PocketBase SSE → StreamProvider → UI rebuild | Polling (5s) or WebSockets → $state reactive store → UI update |
| Share event | Native Share API → `https://popote.io/s/{code}` | Web Share API → `https://popote.io/s/{code}` |

**Key insight:** UX flows are identical. Implementation changes but user experience remains the same.

---

### 2.4 Categories (Fixed Enum)

✅ **FULLY TRANSFERS** — Product definition, unchanged.

```typescript
// lib/constants/categories.ts
export const CATEGORIES = [
  { key: 'apero', label: '🥂 Apéro', emoji: '🥂' },
  { key: 'entree', label: '🥗 Entrée', emoji: '🥗' },
  { key: 'plat', label: '🍖 Plat', emoji: '🍖' },
  { key: 'dessert', label: '🍰 Dessert', emoji: '🍰' },
  { key: 'boissons', label: '🍷 Boissons', emoji: '🍷' },
  { key: 'jeux', label: '🎲 Jeux / Activités', emoji: '🎲' },
  { key: 'autre', label: '📦 Autre', emoji: '📦' },
] as const;
```

---

## 3. Key Architectural Decisions for New Stack

### 3.1 SvelteKit State Management

**Decision:** Use **Svelte 5 runes** (`$state`, `$derived`) for local state + **context API** for shared state.

**Rationale:**
- Svelte 5 runes provide reactive state without boilerplate (no Riverpod complexity)
- Context API allows passing stores down component tree (similar to Riverpod providers)
- Server/client split is natural in SvelteKit (load functions for server data fetching)

**Example pattern:**

```typescript
// lib/stores/event-store.svelte.ts
export class EventStore {
  event = $state<Event | null>(null);
  participants = $state<Participant[]>([]);
  items = $state<Item[]>([]);

  constructor(initialData: { event: Event; participants: Participant[]; items: Item[] }) {
    this.event = initialData.event;
    this.participants = initialData.participants;
    this.items = initialData.items;
  }

  addItem(item: Item) {
    this.items = [...this.items, item];
  }

  removeItem(itemId: string) {
    this.items = this.items.filter(i => i.id !== itemId);
  }
}

// In component:
const store = getContext<EventStore>('eventStore');
```

**Migration from Riverpod:**
- `FutureProvider` → SvelteKit `load` function (server-side data fetching)
- `StreamProvider` → Polling or WebSocket store (real-time updates)
- `StateProvider` → `$state` rune (local reactive state)

---

### 3.2 Drizzle Schema Design (Postgres)

**Decision:** Use **Drizzle ORM** with **Postgres** for type-safe database access.

**Rationale:**
- Type safety: Drizzle generates TypeScript types from schema (unlike PocketBase JS hooks)
- Migration tooling: `drizzle-kit` generates migrations from schema changes
- Postgres: Production-ready, ACID-compliant, better scalability than SQLite
- Aspire orchestration: Postgres container managed by Aspire (no manual setup)

**Schema location:** `app/src/lib/db/schema.ts`

**Migration workflow:**
1. Define schema in `schema.ts`
2. Run `drizzle-kit generate` to create migration files
3. Run `drizzle-kit migrate` to apply migrations to Postgres

**Connection:**
```typescript
// lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';

const client = postgres(DATABASE_URL);
export const db = drizzle(client);
```

---

### 3.3 Device ID Strategy in SvelteKit

**Decision:** Use **localStorage** to persist device ID (browser-based anonymous auth).

**Rationale:**
- PWA runs in browser, localStorage is persistent across sessions
- Similar to Flutter's SharedPreferences pattern
- No account required (anonymous users with stable device ID)

**Implementation:**

```typescript
// lib/utils/device-id.ts
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

**Migration from Flutter:**
- SharedPreferences → localStorage
- UUID generation → `crypto.randomUUID()` (Web Crypto API)

---

### 3.4 PWA Configuration

**Decision:** Use **@vite-pwa/sveltekit** for PWA support.

**Rationale:**
- Zero-config PWA generation with Vite plugin
- Offline support (service worker caching)
- Install prompt on mobile (iOS/Android)
- No app store distribution required

**Configuration:**

```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default {
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Popote',
        short_name: 'Popote',
        description: 'Collaborative meal planning',
        theme_color: '#ffffff',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
};
```

**Deep linking:**
- Flutter Universal Links → Standard HTTPS URLs (no platform-specific config)
- URL format unchanged: `https://popote.io/s/{shareCode}`
- SvelteKit routing: `app/src/routes/s/[code]/+page.server.ts`

---

### 3.5 Observability Tooling

**Decision:** Use **OpenTelemetry** integration via Aspire (built-in).

**Rationale:**
- Aspire provides observability dashboard out-of-the-box
- Traces, logs, metrics unified in Aspire dashboard
- SvelteKit server logs automatically collected
- Postgres queries traced via Drizzle integration

**What to instrument:**
- Event creation (timing, errors)
- Share code generation (collision rate)
- Real-time sync (update latency)
- Database queries (slow query detection)

**No additional setup required** — Aspire wires this automatically when running with `aspire run`.

---

## 4. Real-Time Sync Strategy

### 4.1 PocketBase SSE vs. SvelteKit Options

**PocketBase (old):**
- Server-Sent Events (SSE) for real-time updates
- Client subscribes to collection changes
- Push-based (server notifies client immediately)

**SvelteKit options:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Polling** | Simple, no server changes | Higher latency (5-10s), more requests | ✅ **Start with this** |
| **WebSockets** | Low latency, bidirectional | Complex setup, stateful server | ⏳ **Phase 2 if needed** |
| **SSE** | Push-based, HTTP/1.1 compatible | Requires server endpoint | ⏳ **Phase 2 if needed** |

**Decision for MVP:** Use **5-second polling** for real-time sync.

**Rationale:**
- Simplest to implement (no server changes)
- Good enough for MVP (5s latency acceptable for collaborative editing)
- Can upgrade to WebSockets later if needed
- No connection management complexity

**Implementation:**

```typescript
// lib/stores/poll-store.svelte.ts
export function createPollStore(eventId: string, intervalMs = 5000) {
  let items = $state<Item[]>([]);
  let participants = $state<Participant[]>([]);

  let intervalId: number;

  async function refresh() {
    const res = await fetch(`/api/events/${eventId}`);
    const data = await res.json();
    items = data.items;
    participants = data.participants;
  }

  function start() {
    refresh(); // Initial load
    intervalId = setInterval(refresh, intervalMs);
  }

  function stop() {
    clearInterval(intervalId);
  }

  return { items, participants, start, stop };
}
```

---

## 5. Risk Areas in Migration

### 5.1 Real-Time Sync Latency

**Risk:** Polling (5s) is slower than PocketBase SSE (instant).

**Mitigation:**
- Acceptable for MVP (5s latency is fine for meal planning)
- If user feedback demands lower latency, upgrade to WebSockets
- SvelteKit supports WebSockets via `ws` library (straightforward integration)

**Acceptance criteria:** Users see updates within 5 seconds.

---

### 5.2 Device ID Collision (localStorage)

**Risk:** If user clears browser storage, device ID is lost (looks like new user).

**Mitigation:**
- Same risk as Flutter's SharedPreferences (user uninstall app)
- Product decision: no accounts = ephemeral identity is acceptable
- Future: Optional OAuth login to persist identity across devices

**Acceptance criteria:** Device ID persists across sessions (unless user clears storage).

---

### 5.3 Share Code Uniqueness

**Risk:** Share code collision with 36^6 = ~2 billion combinations.

**Mitigation:**
- Same implementation as PocketBase (retry logic up to 10 attempts)
- Collision probability is negligible at MVP scale (<10K events)
- If collision occurs, event creation fails gracefully with error message

**Acceptance criteria:** Share code generation succeeds 99.9%+ of the time.

---

### 5.4 Postgres Connection Management

**Risk:** SvelteKit serverless deployments (Vercel, Netlify) may exhaust Postgres connections.

**Mitigation:**
- Use connection pooling (Drizzle + `postgres` library supports this)
- Aspire orchestration ensures Postgres is always available in dev
- For production: Use managed Postgres (Supabase, Neon) with built-in pooling

**Acceptance criteria:** No connection pool exhaustion under normal load.

---

### 5.5 PWA Installation UX

**Risk:** Users may not realize they can install the PWA (no app store visibility).

**Mitigation:**
- Add install prompt UI (banner or modal on first visit)
- Clear messaging: "Add to Home Screen" on mobile
- Test on iOS Safari (PWA support is quirky)

**Acceptance criteria:** 50%+ of users successfully install PWA on mobile.

---

## 6. Migration Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create Drizzle schema (`app/src/lib/db/schema.ts`)
- [ ] Generate migrations with `drizzle-kit generate`
- [ ] Setup Postgres in Aspire (`apphost.ts` already has this)
- [ ] Test database connection in SvelteKit
- [ ] Port share code generation logic to TypeScript
- [ ] Port category constants to TypeScript

### Phase 2: Core Features (Week 3-4)
- [ ] Event creation form + server action
- [ ] Event detail page with participants and items
- [ ] Join event flow (URL param → device ID → participant creation)
- [ ] Add item form + server action
- [ ] Edit/delete item actions
- [ ] Share button with Web Share API

### Phase 3: Real-Time Sync (Week 5)
- [ ] Implement 5-second polling store
- [ ] Test sync latency with 2+ browser tabs
- [ ] Add optimistic UI updates (instant feedback before sync)

### Phase 4: PWA + Polish (Week 6-7)
- [ ] Install @vite-pwa/sveltekit
- [ ] Configure manifest.json
- [ ] Test offline behavior
- [ ] Add install prompt UI
- [ ] Test on iOS Safari and Android Chrome

**Total timeline:** 7 weeks (same as Flutter+PocketBase plan).

---

## 7. What We're Gaining

### 7.1 Type Safety Everywhere
- Drizzle generates TypeScript types from schema
- Zod validates API inputs (compile-time + runtime)
- No more JS hooks with no IntelliSense

### 7.2 Simpler Deployment
- SvelteKit builds to static files or serverless functions
- No need for separate backend deployment (PocketBase executable)
- Aspire orchestrates dev environment (Postgres, SvelteKit)

### 7.3 PWA Benefits
- No app store approval process
- Works on desktop, mobile, tablet (true cross-platform)
- Instant updates (no app store release cycle)

### 7.4 Better DX (Developer Experience)
- Hot module replacement (instant feedback)
- Drizzle Studio (GUI for database inspection)
- Aspire dashboard (observability built-in)

---

## 8. What We're Losing

### 8.1 Native Mobile Features
- No native push notifications (web push is limited on iOS)
- No background sync (PWA service workers have restrictions)
- No native deep linking config (relies on standard URLs)

**Mitigation:** These features are not required for MVP. If needed later, can add Capacitor (hybrid approach).

---

### 8.2 PocketBase's Built-in Realtime
- SSE is instant, polling is 5s latency
- PocketBase subscriptions are elegant (one-line setup)

**Mitigation:** 5s latency is acceptable for MVP. Can upgrade to WebSockets if needed.

---

## 9. Questions for Victor

(See `docs/questions-for-victor.md` for detailed questions)

1. **Share code format:** Keep 6-char alphanumeric or change to 8-char?
2. **Real-time latency:** Is 5-second polling acceptable for MVP, or must we have instant sync?
3. **Offline support:** Should PWA work fully offline, or is online-only acceptable?
4. **Domain:** Do we already own `popote.io` for share links?

---

## 10. Approval Checklist

- [ ] Architecture decisions reviewed by Victor
- [ ] Migration plan approved by team
- [ ] Risk mitigations validated
- [ ] Timeline feasible (7 weeks)
- [ ] Questions for Victor answered

---

**Next Steps:**
1. Victor reviews this document
2. Answers questions in `docs/questions-for-victor.md`
3. Ripley updates `.squad/decisions.md` with new architecture
4. Ripley proposes initial Drizzle schema in `.squad/decisions/inbox/ripley-drizzle-schema.md`
5. Team begins Phase 1 implementation

---

**Document Status:** ✅ Complete — Awaiting Victor's review
