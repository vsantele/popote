# Squad Decisions

---

## ⚠️ ARCHITECTURE PIVOT — 2026-03-22

**Victor pivoted the project from Flutter+PocketBase to SvelteKit+Drizzle+Postgres.**

**Old stack (moved to `old/`):**
- Flutter (mobile app)
- PocketBase (SQLite backend with JS hooks)
- Riverpod state management
- Deep linking (GoRouter)

**New stack:**
- SvelteKit (TypeScript PWA)
- Drizzle ORM (type-safe database access)
- Postgres (orchestrated via Aspire)
- shadcn-svelte (UI components, already setup)
- PWA support (offline, installable)
- Observability (Aspire built-in)

**Reason:** Mobile-first PWA with SvelteKit is lighter, faster to iterate, and aligns better with "everywhere access" goal.

**Migration Plan:** See `docs/migration-plan.md`

**All decisions below marked as SUPERSEDED are from the old Flutter+PocketBase architecture.**

---

## Active Decisions

### 1. State Management: Riverpod [SUPERSEDED]

**Status:** Approved  
**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Impact:** High (affects all Flutter code)

Use **Riverpod** for state management (not Provider or GetX).

**Rationale:**
- Compile-time safety (code-generated, typos fail at build-time)
- Native async & streaming support (FutureProvider, StreamProvider for SSE)
- No BuildContext required (cleaner separation of concerns)
- Lightweight (Riverpod only, faster compile times)
- Intuitive for small teams (providers as computed values)

**Implementation:**
- Repository layer: Provider-based dependency injection
- State layer: FutureProvider for API calls, StateProvider for UI state
- Real-time layer: StreamProvider.family for PocketBase subscriptions
- UI layer: ConsumerWidget/ConsumerStatefulWidget for integration

**Constraints:**
- No Provider package mixing
- All async operations use FutureProvider or StreamProvider
- Use Freezed or Equatable for model equality

**Approval Status:**
- ✅ Dallas (Flutter lead)
- ✅ Kane (Backend lead)
- ✅ Victor (Product)

---

### 2. Deep Linking & Share Code Strategy [SUPERSEDED]

**Status:** Approved (Flutter implementation superseded)  
**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Impact:** High (affects invite UX and backend)

Use **6-8 character alphanumeric share codes** combined with **platform-native deep linking** (App Links for Android, Universal Links for iOS).

**Link Format:** `https://popote.io/s/{shareCode}`  
**Example:** `https://popote.io/s/ABC123`

**Rationale:**
- No account dependency (works for guests who don't have app installed)
- Platform native deep linking (seamless UX, system trust)
- Stateless server logic (simple PocketBase query by share_code)
- Privacy (non-sequential codes, revocable, prevents enumeration)
- Works across SMS, WhatsApp, email, any text channel

**Implementation - Backend (Kane):**
- Add `share_code` field to events table (unique, indexed)
- Generate on creation: 8-char alphanumeric
- API: `GET /api/collections/events/records?filter=share_code='{code}'`
- Generate share codes in PocketBase hooks (atomic, no race conditions)

**Implementation - Frontend (Dallas):**
- Domain setup: Register `popote.io` and host `.well-known/assetlinks.json` and `apple-app-site-association`
- Deep link handler: Extract share code from path, fetch event, navigate to detail screen
- Test commands:
  - Android: `adb shell am start -W -a android.intent.action.VIEW -d "https://popote.io/s/ABC123" com.popote`
  - iOS: `xcrun simctl openurl booted "https://popote.io/s/ABC123"`

**Constraints:**
- Domain registration required before beta release
- SSL certificate required (no HTTP)
- App must be published to store for production-level reliability

**Rollback Plan:**
- Fall back to `Share` package with app store redirect if deep linking fails
- Slightly worse UX but functionally complete

**Approval Status:**
- ✅ Dallas (Flutter lead)
- ✅ Kane (Backend lead)
- ✅ Victor (Product)

---

### 3. Backend Architecture: PocketBase with JS Hooks [SUPERSEDED]

**Status:** Approved (PocketBase replaced by Postgres + Drizzle)  
**Implemented by:** Kane (Backend)  
**Date:** 2026-03-22  
**Impact:** High (defines backend infrastructure)

Use **PocketBase JavaScript hooks** for backend business logic instead of external API layer.

**Rationale:**
- Zero additional infrastructure (runs inside PocketBase)
- Atomic operations (share_code generation is safe from race conditions)
- Direct database access (validation and constraints enforced)
- Single deployment artifact (simplified ops)
- Automatic host participant creation (no separate call needed)

**Trade-offs:**
- ⚠️ Logic coupled to PocketBase
- ⚠️ Testing requires PocketBase instance
- ⚠️ JavaScript (not TypeScript) for hooks

**Implementation:**
- `pb_hooks/main.pb.js` with:
  - Share code generation on event creation (6-char uppercase alphanumeric)
  - Auto-creation of host participant
  - Category validation for items
  - Uniqueness checks with retry logic (max 10 attempts)

**Collections:**
- `events`: id, name, date, location, description, host_name, host_device_id, share_code, created
- `participants`: id, event (FK), name, device_id, is_host, created
- `items`: id, event (FK), participant (FK), name, category (select), quantity, created

**Categories:** apero, entree, plat, dessert, boissons, jeux, autre (fixed enum)

**Patterns:**
- Device-based auth (device_id for anonymous users, no accounts required)
- Real-time sync via PocketBase SSE
- Share codes revocable by host
- Cascade delete (deleting event removes all participants and items)

**Scalability:**
- Current approach scales to ~10K events easily
- If business logic becomes complex: extract to separate service or migrate to PocketBase Go extensions

**Approval Status:**
- ✅ Dallas (Frontend lead)
- ✅ Ripley (Architect)
- ✅ Victor (Product)

---

### 4. Test Strategy: Hybrid Automated + Manual [SUPERSEDED]

**Status:** Superseded by SvelteKit testing strategy (2026-03-23)  
**Proposed by:** Lambert (QA Lead)  
**Date:** 2026-03-22  
**Impact:** Medium (formerly defined test methodology)

**Deprecated Decision:**
Hybrid testing approach combining Flutter widget tests + manual validation.

**Why Superseded:**
- Architecture pivot to SvelteKit requires Vitest + Playwright
- Testing tools changed but strategy remains (80% automated, 20% manual)
- Real-time sync validation approach enhanced for polling/WebSocket
- Old test plan archived for reference

**New Test Strategy Status:**
- ✅ Test plan updated for SvelteKit + Drizzle stack
- ✅ Test pyramid designed (40% unit, 30% component, 25% integration, 5% E2E)
- ✅ Performance validation approach documented
- ⏸️ Implementation awaiting Victor's approval

---

## NEW ARCHITECTURE DECISIONS (SvelteKit + Drizzle + Postgres)

**Status:** Proposed — Awaiting Victor's review of `docs/migration-plan.md` and `docs/questions-for-victor.md`

### 5. SvelteKit State Management: Svelte 5 Runes

**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Status:** ⏳ Awaiting approval

Use **Svelte 5 runes** (`$state`, `$derived`) for local reactive state + **context API** for shared state across components.

**Rationale:**
- Svelte 5 runes provide reactive state without boilerplate (simpler than Riverpod)
- Context API allows passing stores down component tree
- Server/client split is natural in SvelteKit (load functions for server data)
- No external state library needed (built into Svelte 5)

**Implementation:**
```typescript
// lib/stores/event-store.svelte.ts
export class EventStore {
  event = $state<Event | null>(null);
  participants = $state<Participant[]>([]);
  items = $state<Item[]>([]);
  
  addItem(item: Item) { this.items = [...this.items, item]; }
  removeItem(id: string) { this.items = this.items.filter(i => i.id !== id); }
}
```

**Migration from Riverpod:**
- `FutureProvider` → SvelteKit `load` function
- `StreamProvider` → Polling or WebSocket store
- `StateProvider` → `$state` rune

**Approval Status:**
- ⏳ Victor (Product)
- ⏳ Dallas (Frontend, if involved in SvelteKit)

---

### 6. Database: Drizzle ORM + Postgres

**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Status:** ⏳ Awaiting approval

Use **Drizzle ORM** with **Postgres** for type-safe database access.

**Rationale:**
- Type safety: Drizzle generates TypeScript types from schema
- Migration tooling: `drizzle-kit` generates migrations from schema changes
- Postgres: Production-ready, ACID-compliant, better scalability than SQLite
- Aspire orchestration: Postgres container managed by Aspire (no manual setup)

**Schema Design:**
- Same data model as PocketBase (events, participants, items)
- UUID primary keys (Postgres standard)
- Cascade deletes preserved
- Categories as text enum (validated by Zod)

**Migration Workflow:**
1. Define schema in `app/src/lib/db/schema.ts`
2. Run `drizzle-kit generate` to create migrations
3. Run `drizzle-kit migrate` to apply to Postgres

**Approval Status:**
- ⏳ Victor (Product)
- ⏳ Kane (Backend, if involved in new stack)

---

### 7. Device ID Strategy: localStorage (Browser)

**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Status:** ⏳ Awaiting approval

Use **localStorage** to persist device ID for anonymous auth (browser-based).

**Rationale:**
- PWA runs in browser, localStorage is persistent across sessions
- Same pattern as Flutter's SharedPreferences
- No account required (anonymous users with stable device ID)
- Web Crypto API provides `crypto.randomUUID()`

**Implementation:**
```typescript
export function getDeviceId(): string {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}
```

**Trade-offs:**
- ⚠️ If user clears browser storage, device ID is lost (same as uninstalling Flutter app)
- ✅ No server-side session management needed

**Approval Status:**
- ⏳ Victor (Product)

---

### 8. PWA Configuration: @vite-pwa/sveltekit

**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Status:** ⏳ Awaiting approval

Use **@vite-pwa/sveltekit** for PWA support (offline, installable).

**Rationale:**
- Zero-config PWA generation with Vite plugin
- Offline support (service worker caching)
- Install prompt on mobile (iOS/Android)
- No app store distribution required

**Features:**
- Manifest.json auto-generated
- Service worker for offline caching
- Install prompt UI (custom banner)
- Works on desktop, mobile, tablet

**Deep Linking:**
- No platform-specific config needed (standard HTTPS URLs)
- URL format: `https://popote.io/s/{shareCode}`
- SvelteKit routing: `app/src/routes/s/[code]/+page.server.ts`

**Approval Status:**
- ⏳ Victor (Product)

---

### 9. Real-Time Sync: 5-Second Polling (MVP)

**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Status:** ⏳ Awaiting approval

Use **5-second polling** for real-time sync (MVP). Upgrade to WebSockets if latency becomes issue.

**Rationale:**
- Simplest to implement (no server changes)
- Good enough for MVP (5s latency acceptable for meal planning)
- Can upgrade to WebSockets later if needed
- No connection management complexity

**Implementation:**
```typescript
export function createPollStore(eventId: string, intervalMs = 5000) {
  let items = $state<Item[]>([]);
  
  async function refresh() {
    const res = await fetch(`/api/events/${eventId}`);
    const data = await res.json();
    items = data.items;
  }
  
  setInterval(refresh, intervalMs);
  return { items };
}
```

**Upgrade Path:**
- If user feedback demands lower latency: WebSockets with `ws` library
- SvelteKit supports WebSocket endpoints (straightforward integration)

**Approval Status:**
- ⏳ Victor (Product)

---

### 10. Observability: Aspire Built-In (OpenTelemetry)

**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Status:** ⏳ Awaiting approval

Use **Aspire's built-in observability** (OpenTelemetry) for traces, logs, metrics.

**Rationale:**
- Aspire provides dashboard out-of-the-box
- Traces, logs, metrics unified in Aspire dashboard
- SvelteKit server logs automatically collected
- Postgres queries traced via Drizzle integration
- No additional setup required

**What to Instrument:**
- Event creation (timing, errors)
- Share code generation (collision rate)
- Real-time sync (update latency)
- Database queries (slow query detection)

**Approval Status:**
- ⏳ Victor (Product)

---

## 11. Backend Architecture: Drizzle + Postgres Migration — ✅ IMPLEMENTED

**Status:** ✅ Implemented  
**Proposed by:** Kane (Backend Lead)  
**Date:** 2026-03-23  
**Impact:** Critical (complete backend rewrite from PocketBase to PostgreSQL)

Use **Drizzle ORM** with **PostgreSQL** orchestrated via **.NET Aspire** for type-safe database access and reproducible development environments.

**Implementation Complete:** API routes tested and verified with Aspire + Postgres stack.

See orchestration log for details: `.squad/orchestration-log/2026-03-24T00-01-15-kane.md`

---

## 12. SvelteKit Frontend Architecture Migration — ✅ COMPLETE

**Status:** ✅ Implemented  
**Proposed by:** Dallas (Frontend Lead)  
**Date:** 2026-03-23  
**Impact:** High (completes frontend migration from Flutter+PocketBase)

Complete SvelteKit frontend with **polling-based real-time updates**, **PWA support**, and **Superforms integration**. All PocketBase references removed.

**Implementation Complete:** Frontend integrated with Drizzle + API routes, ready for integration testing.

See orchestration log for details: `.squad/orchestration-log/2026-03-24T00-01-15-dallas.md`

---

## 13-20. Additional Decisions (From Migration Audit)

See `.squad/orchestration-log/2026-03-24T00-01-15-ripley.md` for complete audit results and additional decisions 13-20 documenting:
- SvelteKit Folder Structure  
- Drizzle Schema Design
- Test File Structure (SvelteKit convention)
- Aspire Orchestration
- Device ID Strategy (localStorage + cookies)
- Real-Time Sync (Polling vs WebSockets)
- Superforms Integration
- Migration Audit Results

**Status:** Audit complete (60% migration), blockers identified and documented.

---

---

## 21. Streamlined Name Collection Flow — ⏳ AWAITING APPROVAL

**Proposed by:** Dallas (Frontend Lead)  
**Date:** 2026-03-29  
**Status:** ⏳ Awaiting Victor's approval  
**Impact:** Medium (improves UX, affects join flow)

Restructured name collection to ask users for their name at the right time:
- **Hosts**: Provide name when creating event (unchanged)
- **Guests**: Provide name ONCE when joining via share code (new `/join/[code]` route)
- **Adding items**: Never asks for name (uses stored userName from cookie)

**Benefits:**
- ✅ Name collected once at natural entry point (when joining)
- ✅ Adding items is faster (no name field)
- ✅ Clear distinction between "joining an event" and "adding items"

**Implementation:**
- New route: `/join/[code]` with guest name form
- Creates participant record in database
- Stores userName in httpOnly cookie
- Redirects to event page after join
- Home join button redirects to `/join/[code]`
- Event detail guards against users without userName

**Trade-offs:**
- ⚠️ Additional route pattern (mitigated by intuitive UX)
- ⚠️ Cookie dependency (same pattern as existing deviceId cookie)

**Testing Status:**
- ✅ Dev server, TypeScript compilation verified
- ⏳ Manual integration testing pending

**Approval Status:**
- ⏳ Victor (Product Owner)

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
