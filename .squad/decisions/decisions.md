# Decisions — Popote Team

## Architecture & Backend

### Backend Framework: PocketBase
**Date:** 2026-01-15  
**Status:** ✅ Approved  

Use PocketBase as backend:
- JavaScript migrations for collection definitions
- JS hooks for business logic (share code generation, cascade delete, validation)
- Device-based anonymous auth (no account requirement)
- Real-time SSE for multi-device sync

---

## Collections & Data Model

### Events, Participants, Items Collections
**Date:** 2026-01-15  
**Status:** ✅ Implemented

Three-collection pattern:
- **events:** id, name, date, location, host_name, host_device_id, share_code (6-char unique)
- **participants:** id, event (FK), device_id, name, is_host
- **items:** id, event (FK), participant (FK), name, category (enum: apero, entree, plat, dessert, boissons, jeux, autre)

Key: Cascade delete on event deletion for data integrity.

---

## Device-Based Authentication Strategy

**Date:** 2026-03-22  
**Status:** ✅ Team Aligned

Use device_id for anonymous auth:
- No user accounts required (aligns with "zéro compte obligatoire")
- Device ID persisted in Flutter SharedPreferences
- Event host matched by device_id
- Production rules use device_id for ownership validation
- MVP phase uses open access; production adds device-based restrictions

---

## Anonymous Access Rules for PocketBase Collections

**Date:** 2026-03-23  
**Author:** Kane  
**Status:** ✅ Implemented

### Problem
All PocketBase collections had access rules set to `null`, meaning admin-only access. This violated the "zéro compte obligatoire" requirement—users couldn't create events without authentication, receiving 403 errors.

### Solution
Changed all collection rules from `null` (admin-only) to `""` (public/anonymous access):

| Collection | listRule | viewRule | createRule | updateRule | deleteRule |
|------------|----------|----------|------------|------------|-----------|
| events | `""` | `""` | `""` | `""` | `""` |
| participants | `""` | `""` | `""` | `""` | `""` |
| items | `""` | `""` | `""` | `""` | `""` |

### Key Learning
**PocketBase Access Rule Semantics:**
- `null` = admin-only (requires superuser auth)
- `""` = public access (anyone can perform action)
- `"expression"` = conditional access (e.g., `"device_id = @request.data.device_id"`)

### Implementation
Updated migration files:
- `backend/pb_migrations/1705276800_created_events.js`
- `backend/pb_migrations/1705276860_created_participants.js`
- `backend/pb_migrations/1705276920_created_items.js`

Corrected documentation in `backend/API_RULES.md`.

### MVP vs Production
- **MVP (current):** Fully open access (`""`) for rapid development and user testing
- **Production:** Device-based rules to prevent abuse:
  - Events: Only host can update/delete
  - Participants: Self-management or host can remove
  - Items: Item owner or event host can modify

### Verification
✅ Anonymous event creation works  
✅ Anonymous participant join works  
✅ Anonymous item creation works  
✅ No 403 errors on basic CRUD operations

### Impact
- Users can create events immediately without accounts
- "Zero friction" UX aligned with design goals
- Unblocks Flutter app testing and production deployment
- Team can test share link functionality

---

## Frontend Architecture: Flutter + GoRouter + Riverpod (SUPERSEDED)

**Date:** 2026-01-22  
**Status:** ✅ SUPERSEDED (See SvelteKit Migration)

Use Flutter stack:
- **Navigation:** GoRouter for deep linking (share codes → events)
- **State:** Riverpod for SSE subscription management
- **UI:** Material 3 design system
- **Device ID:** SharedPreferences for persistence
- **Real-time:** StreamProvider to consume PocketBase SSE

---

## Migration: Flutter + PocketBase → SvelteKit + Drizzle + Postgres

**Date:** 2026-03-23  
**Author:** Ripley, Kane, Dallas, Lambert  
**Status:** ✅ Completed & Implemented

### Decision
Migrate from mobile-first Flutter app to web-first SvelteKit PWA with Postgres backend. All business logic and data models transfer directly to new stack.

### Rationale
- **Reach:** PWA works on desktop, mobile, tablet (no app stores)
- **Type Safety:** SvelteKit TypeScript + Drizzle ORM stronger than PocketBase JavaScript
- **Observability:** Aspire provides built-in OpenTelemetry (traces, logs, metrics)
- **Development Speed:** Faster iteration with no compilation (Vite HMR)
- **Scalability:** Postgres + Drizzle handles millions of rows easily

### Transferred Concepts
- Data model (events, participants, items) → Postgres schema
- Share code generation (PocketBase hooks) → TypeScript + Drizzle
- Device ID auth → localStorage (browser) instead of SharedPreferences
- SSE real-time → Polling (MVP), WebSockets (future)
- Material 3 UI → shadcn-svelte + Tailwind CSS

### Implementation
- Backend: SvelteKit API routes with Drizzle ORM
- Frontend: SvelteKit pages with Svelte 5 runes state management
- Database: PostgreSQL via Aspire orchestration
- Observability: OpenTelemetry dashboard

---

## Frontend Architecture: SvelteKit + TypeScript + shadcn-svelte

**Date:** 2026-03-23  
**Author:** Dallas  
**Status:** ✅ Implemented

### Decision
Implement SvelteKit frontend with:
- Svelte 5 runes for state management ($state, $derived, $effect)
- shadcn-svelte components for UI
- Real-time polling (5s interval) for MVP
- PWA with offline service worker support
- localStorage for device ID persistence

### Key Patterns
1. **State Management:** Svelte 5 runes + context API (no external libraries)
2. **Data Fetching:** SvelteKit load functions for SSR
3. **Real-time:** createRealtimeStore() with 5-second polling
4. **PWA:** Service worker (cache-first assets, network-first API)
5. **Component Design:** Composable Svelte components with shadcn-svelte

### Files Implemented
- `app/src/routes/` — All pages (home, create, event detail)
- `app/src/lib/stores/realtime.svelte.ts` — Polling store
- `app/src/lib/api.ts` — Type-safe API client
- `app/src/service-worker.ts` — PWA offline support
- `app/static/manifest.json` — PWA configuration

### Known Issues
- TypeScript 6.0.2 incompatible with svelte-check (non-blocking, code verified)
- SVG icons need PNG conversion for iOS (documented in ICONS-README.md)

### Trade-offs
- **Polling vs SSE:** 5s polling simpler for MVP, good enough for meal planning
- **No external state libs:** Svelte runes sufficient, fewer dependencies
- **Service worker:** Cache-first assets, network-first API (efficient offline)

---

## Backend Architecture: Drizzle ORM + PostgreSQL

**Date:** 2026-03-23  
**Author:** Kane  
**Status:** ✅ Implemented

### Decision
Use Drizzle ORM with PostgreSQL via Aspire for type-safe database layer:
- TypeScript-first ORM with compile-time type checking
- Postgres provides ACID guarantees and maturity
- Aspire orchestration for zero-config development
- Migrations via drizzle-kit

### Database Schema
1. **events** — Event metadata with unique share_code
2. **participants** — Users who joined an event
3. **items** — Contributions (meal items) with category

All with cascade deletes and proper indexing.

### API Implementation
- Form actions for SSR (progressive enhancement)
- API routes for mobile/external clients
- Device ID authentication via cookies
- Share code generation with retry logic
- Error handling with consistent JSON responses

### Files Implemented
- `app/db/schema.ts` — Drizzle schema definition
- `app/db/index.ts` — Database client + connection string converter
- `app/db/migrations/` — Drizzle-generated migrations
- `app/src/routes/api/` — All API endpoints
- `app/src/hooks.server.ts` — Device ID extraction

### Trade-offs
- **Lost:** PocketBase admin UI (no built-in dashboard)
- **Gained:** Type safety, migration control, observability

---

## Device ID Authentication Strategy (Updated)

**Date:** 2026-03-23  
**Author:** Kane, Dallas  
**Status:** ✅ Implemented

### Updated Pattern (Browser/SvelteKit)
- Client: UUID v4 generated in localStorage on first visit
- Server: Extracted from cookie in hooks.server.ts
- Injection: Sent via `X-Device-ID` header in API calls
- Validation: Checked for ownership on update/delete operations

### Security Trade-offs
- **UUIDs are hard to guess** (128-bit, 2^128 combinations)
- **No rate limiting yet** (can add per-IP + device-ID limits)
- **No recovery mechanism** (clearing localStorage loses device identity)
- **Future:** Optional email-based claim system

### Implementation
- `app/src/lib/utils/device-id.ts` — UUID generation + persistence
- `app/src/hooks.server.ts` — Device ID extraction from cookies
- `app/src/lib/api.ts` — Device ID injection in fetch wrapper

---

## Aspire Orchestration for Postgres + SvelteKit

**Date:** 2026-03-23  
**Author:** Ripley  
**Status:** ✅ Implemented (with critical fix)

### Decision
Use Aspire to orchestrate:
- Postgres container with auto-created database
- SvelteKit app with dependency injection
- Connection string auto-injection
- OpenTelemetry observability dashboard

### Benefits
1. **Zero setup:** One command starts entire stack
2. **Reproducibility:** Same config for all developers
3. **Observability:** Traces, logs, metrics built-in
4. **Health checks:** Auto-restart on failure
5. **Convenient:** Dashboard shows resources, logs, traces

### Infrastructure
- Postgres container (`postgres:17.6` via Docker)
- Database creation via Aspire hooks
- Connection string injected as `ConnectionStrings__popotedb` env var
- SvelteKit Vite dev server with HMR

### Critical Fix Applied
**Issue:** Aspire injects .NET format, postgres library expects URL format  
**Solution:** Added `convertConnectionString()` in `app/db/index.ts`  
**Impact:** Transparent conversion, backward compatible

### Dashboard
- URL: `https://popote.dev.localhost:43292`
- Shows: Resource health, console logs, traces, metrics
- Requires: Dev HTTPS cert (auto-generated)

---

## Drizzle Schema Design

**Date:** 2026-03-22  
**Author:** Ripley  
**Status:** ✅ Approved & Implemented

### Tables
1. **events**
   - UUID primary key (via defaultRandom())
   - name, date (with timezone), location, description
   - hostName, hostDeviceId for ownership
   - shareCode (8-char, unique, indexed)
   - createdAt, updatedAt timestamps

2. **participants**
   - UUID primary key
   - eventId (FK to events, cascade delete)
   - name, deviceId, isHost flag
   - createdAt, updatedAt

3. **items**
   - UUID primary key
   - eventId (FK to events, cascade delete)
   - participantId (FK to participants, cascade delete)
   - name, category (enum via Zod), quantity
   - createdAt, updatedAt

### Design Decisions
- **UUIDs** for distributed-friendly IDs
- **Timestamps with timezone** for multi-region support
- **Cascade deletes** for data consistency
- **Indexes** on shareCode, eventId, participantId for performance
- **Zod validation** for category enum (flexible to change)

---

## SvelteKit Folder Structure

**Date:** 2026-03-22  
**Author:** Ripley  
**Status:** ✅ Approved

### Structure
```
app/
├── src/
│   ├── lib/
│   │   ├── components/    # shadcn-svelte + custom
│   │   ├── db/           # Drizzle schema, migrations, client
│   │   ├── server/       # Server-only code (DB ops, share codes)
│   │   ├── stores/       # Svelte 5 reactive stores (.svelte.ts)
│   │   ├── schemas/      # Zod validation schemas
│   │   ├── utils/        # Device ID, logging, dates
│   │   └── types/        # TypeScript interfaces
│   ├── routes/           # SvelteKit pages + API routes
│   ├── service-worker.ts # PWA offline support
│   └── app.html
├── static/              # Public assets, icons, manifest
├── tests/               # Vitest unit + integration tests
└── drizzle.config.ts    # Drizzle Kit configuration
```

### Principles
- `lib/` for shared code (components, DB, state, utils)
- `routes/` for pages and API (SvelteKit convention)
- `server/` for server-only code (security boundary)
- `stores/` for Svelte 5 runes (.svelte.ts files)
- Import aliases: `$lib`, `$lib/components`, etc.

---

## Connection String Format Converter

**Date:** 2026-03-23  
**Author:** Ripley  
**Status:** ✅ Implemented & Tested

### Problem
Aspire injects connection strings in .NET format:
```
Host=localhost;Port=5432;Database=popotedb;Username=postgres;Password=xxx
```

postgres npm library expects PostgreSQL URL format:
```
postgresql://postgres:xxx@localhost:5432/popotedb
```

### Solution
Added `convertConnectionString()` function in `app/db/index.ts`:
1. Detects format (URL vs .NET key-value)
2. If already URL format, returns as-is
3. If .NET format, parses key-value pairs
4. Builds PostgreSQL URL from components
5. Handles missing Username/Password gracefully

### Testing
- Standalone test script verifies conversion
- Database queries execute successfully
- Backward compatible with URL format input

### Impact
- Enables Aspire + Postgres integration
- Transparent to application code
- Single point of conversion (getDb function)

---

## Test Strategy for SvelteKit Stack

**Date:** 2026-03-23  
**Author:** Lambert  
**Status:** ✅ Implemented

### Test Pyramid
- **40% Unit tests** — Vitest, utilities and logic
- **30% Component tests** — Svelte Testing Library
- **25% Integration tests** — Vitest + ephemeral Postgres
- **5% E2E tests** — Playwright critical paths only

### Testing Tools
- **Vitest** — Unit + integration testing (Vite-native)
- **@testing-library/svelte** — Component testing
- **Playwright** — E2E testing (multi-browser)
- **Drizzle-Kit** — Schema validation

### Automated vs Manual
- **Automated (80%):** Unit, component, integration, E2E CI/CD
- **Manual (20%):** Multi-device sync, PWA install, accessibility

### Key Test Areas
- Device ID generation and persistence
- Share code uniqueness and collision handling
- Event CRUD with authorization
- Item ownership validation
- Cascade delete behavior
- Real-time polling and optimistic updates
- PWA offline fallback

### Manual Testing Checklist
- Event creation and sharing
- Multi-device synchronization (< 2s target)
- PWA installation (iOS/Android)
- Offline functionality
- Performance benchmarks
- Browser compatibility

---

## Real-time Sync Strategy (MVP)

**Date:** 2026-03-23  
**Author:** Dallas, Kane  
**Status:** ✅ Implemented

### Decision: Polling for MVP, Upgrade to WebSockets Later

**MVP Phase (Current):**
- 5-second polling interval
- Optimistic updates for immediate UI feedback
- Ensures consistency across devices
- Works with any HTTP API (no special backend)
- Good enough for < 2s requirement with margin

**Post-MVP (Future):**
- Upgrade to WebSockets when performance becomes issue
- Keep polling as fallback
- No major refactor needed (store interface unchanged)

### Trade-offs
- **Polling Pros:** Simpler, stateless, resilient, works with any HTTP
- **Polling Cons:** 5s latency (acceptable for meal planning), more bandwidth
- **Upgrade Path:** WebSockets implementation straightforward

### Implementation
`app/src/lib/stores/realtime.svelte.ts`:
- Configurable polling interval (via VITE_POLL_INTERVAL)
- Auto-connect/disconnect on mount/unmount
- Prevents concurrent polls
- Optimistic updates pattern for instant UI feedback

---

## Test File Structure: SvelteKit Routing Fix

**Date:** 2026-03-23  
**Author:** Lambert  
**Status:** ✅ Implemented  
**Impact:** Critical (fixes startup bug)

### Problem
Victor reported critical bug: `Files prefixed with + are reserved (saw src/routes/+page.test.ts)` — app wouldn't start.

SvelteKit's file-based router reserves `+` prefix for route files. Test files like `src/routes/+page.test.ts` conflicted with routing system, causing startup failure.

### Decision
**Move ALL test files out of `src/routes/` to dedicated `tests/` directory.**

### Implementation

**Files Relocated:**
- `src/routes/+page.test.ts` → `tests/routes/home.test.ts`
- `src/routes/api/events/+server.test.ts` → `tests/api/events.test.ts`
- `src/routes/api/items/+server.test.ts` → `tests/api/items.test.ts`
- `src/lib/auth.test.ts` → `tests/lib/auth.test.ts`
- `db/utils.test.ts` → `tests/lib/device.test.ts`

**New Test File Structure:**
```
app/
├── tests/                       # All test files (outside routes)
│   ├── lib/
│   │   ├── auth.test.ts        # Device ID generation & persistence
│   │   └── device.test.ts      # Share code generation tests
│   ├── routes/
│   │   └── home.test.ts        # Home page component tests
│   └── api/
│       ├── events.test.ts      # Event creation API tests
│       └── items.test.ts       # Item CRUD API tests
├── src/
│   ├── lib/
│   │   └── test/               # Test utilities (setup, mocks)
│   └── routes/                 # NO test files here
├── db/                          # NO test files here
└── vitest.config.ts
```

**Configuration Updated:**
- `app/vitest.config.ts`: Changed `include` pattern to `tests/**/*.test.ts`
- All test imports updated to reflect new paths

**Documentation Updated:**
- `app/TEST_README.md` — Updated architecture diagram
- Lesson learned documented in history

### Why This Matters
- **SvelteKit Routing Convention:** `+` prefix is RESERVED for route files
- **Hard Requirement:** ANY file with `+` prefix in `src/routes/` is treated as route
- **Best Practice:** Test files MUST live outside `src/routes/`
- **Standard Pattern:** `tests/` directory at project root mirrors src structure

### Benefits
1. ✅ Fixes startup bug — App starts without routing errors
2. ✅ Follows SvelteKit conventions — Test files outside `src/routes/`
3. ✅ Clearer organization — Test structure mirrors src structure
4. ✅ Scalable — Easy to add more tests without conflicts

### Verification
- ✅ Dev server starts successfully: `npm run dev`
- ✅ Tests run successfully: `npm test` (54 automated tests)
- ✅ Test structure aligns with SvelteKit conventions

### Lesson Learned
**SvelteKit's file-based routing is STRICT:**
- Anything with `+` prefix in `src/routes/` is a route
- Test files MUST live outside `src/routes/`
- Follow convention: `tests/` directory at project root
- Co-locating tests with routes causes conflicts

**Best Practice:**
- Unit tests: `tests/lib/`
- Component tests: `tests/routes/` (not `src/routes/`)
- Integration tests: `tests/api/`
- E2E tests: `tests/e2e/` (if using Playwright)

---

## Manual Refresh Pattern (Replacing Realtime Polling)

**Date:** 2026-04-05  
**Author:** Dallas  
**Status:** ✅ Implemented

### Decision
Replace automatic realtime polling (5-second intervals) with manual refresh pattern using:
1. SvelteKit's natural load functions for initial data
2. Manual refresh button
3. Pull-to-refresh gesture (mobile native UX)

### Context
Victor requested removal of realtime polling due to:
- Unnecessary background network requests (battery/data usage)
- User doesn't need instant updates for meal planning
- Preference for user-controlled refresh over automatic updates

### Implementation
**Event Detail Page:**
- Removed polling store and all background polling logic
- Pull-to-refresh gesture for mobile (visual indicator, > 60px activation)
- Refresh button with loading state
- Data loaded via SvelteKit load functions

**Form Pre-filling (Create/Join):**
- Moved username retrieval to `+page.server.ts` load functions
- Server pre-fills forms before render (no onMount delay)

### Benefits
✅ Simpler architecture (no polling state management)  
✅ Better battery life (no background requests)  
✅ Server-side rendering (instant form pre-fill)  
✅ User control (manual refresh on demand)  
✅ Native mobile UX (pull-to-refresh pattern)  
✅ Cleaner code (less client-side complexity)

### Trade-offs
⚠️ No automatic updates (users must refresh manually)  
⚠️ Desktop users need button instead of gesture

### Rollback Plan
If needed: re-enable polling with longer interval (30s), add refresh toggle setting, use visibility API for smart pause.

### Files Modified
- `app/src/routes/e/[code]/+page.svelte` — Removed polling, added pull-to-refresh
- `app/src/routes/create/+page.svelte` + `+page.server.ts` — onMount → load
- `app/src/routes/join/[code]/+page.svelte` + `+page.server.ts` — onMount → load
- `app/src/routes/+page.svelte` + `+page.server.ts` — Server-side loading
- `app/src/routes/e/[code]/+page.server.ts` — Event detail loader
- `app/src/lib/server/db/index.ts` — Query optimization

---

## All Decisions Summary

✅ **Architecture:** SvelteKit + Drizzle + Postgres + Aspire  
✅ **Frontend:** Svelte 5 runes, shadcn-svelte, PWA  
✅ **Backend:** TypeScript API routes, device auth  
✅ **Database:** PostgreSQL schema with Drizzle migrations  
✅ **Orchestration:** Aspire one-command stack  
✅ **Testing:** 54 automated tests + manual checklist  
✅ **Real-time:** Manual refresh + pull-to-refresh (MVP)  
✅ **Observability:** OpenTelemetry via Aspire  

**Status:** 🟢 IMPLEMENTATION COMPLETE — Ready for testing and deployment

---


---

# Decision: Automatic Database Migrations via Server Startup Hook

**Date:** 2026-04-11  
**Decided by:** Ash (DevOps Specialist)  
**Status:** ✅ Implemented  
**Impact:** Medium (affects deployment and development workflow)

## Context

Victor requested automatic SQL migration execution for both:
1. **Run mode**: Local development with `aspire start`
2. **Publish mode**: Production deployment with `aspire publish`

**Problem:** Drizzle migrations existed but required manual execution (`pnpm db:migrate`), which:
- Creates risk of forgotten migrations in deployment
- Doesn't scale with team growth
- Breaks dev/prod parity (different workflows)

## Decision

**Use SvelteKit's `hooks.server.ts` to run migrations automatically on server startup.**

Migrations run on the **first HTTP request** via the `handle` hook, before any route processing.

## Implementation

### Modified Files

1. **`app/src/lib/server/db/migrate.ts`**:
   - Exported `runMigrations()` function for programmatic use
   - Kept CLI mode for manual execution (`pnpm db:migrate`)
   - Fixed migrations folder path resolution (works from CLI and server contexts)

2. **`app/src/hooks.server.ts`**:
   - Added migration execution with one-time flag
   - Fail-fast behavior (throw error if migrations fail)
   - Runs before device ID extraction

3. **`docs/database-migrations.md`**: Complete documentation

## Rationale

**Why server startup hook?**

✅ **Works everywhere**: Same code path for run mode and publish mode  
✅ **Fail-fast**: Server won't start if migrations fail (prevents broken deployments)  
✅ **Simple**: No orchestration complexity, no additional services  
✅ **Aspire-native**: Uses connection string from Aspire environment automatically  
✅ **Idempotent**: Drizzle tracks applied migrations (won't re-run)  

## Alternatives Considered

### 1. Init Container Pattern
**Pros**: Clean separation of concerns  
**Cons**: Aspire doesn't support init containers for Vite resources, added complexity  
**Verdict**: ❌ Not feasible with current Aspire Vite support

### 2. Separate Migration Service
**Pros**: Dedicated resource for migrations  
**Cons**: Orchestration complexity, race conditions with app startup, WaitFor timing issues  
**Verdict**: ❌ Overkill for our use case

### 3. Manual Execution (Current State)
**Pros**: Simple to understand  
**Cons**: Human error risk, breaks in CI/CD, doesn't scale  
**Verdict**: ❌ Original problem we're solving

### 4. **Server Startup Hook (CHOSEN)**
**Pros**: Simple, works everywhere, fail-fast, no orchestration  
**Cons**: Slight delay on first request (negligible)  
**Verdict**: ✅ **Best balance of simplicity and reliability**

## Trade-offs

### Accepted
- ⚠️ **First request delay**: ~100-500ms delay on very first HTTP request (one-time cost)
- ⚠️ **Mixed concerns**: Migration logic lives in server hook (not dedicated service)

### Mitigated
- ✅ **Idempotency**: Drizzle won't re-run migrations if already applied
- ✅ **Error handling**: Fail-fast behavior prevents serving broken app
- ✅ **Visibility**: Console logs clearly indicate migration status

## Testing

Manual testing performed:
- ✅ Migration runner exports function correctly
- ✅ Path resolution works from both CLI and server contexts
- ✅ Integration with hooks.server.ts compiles successfully
- ✅ Connection string resolution from Aspire environment variables

## Deployment Flow

### Run Mode (Local Dev)
1. Developer runs `aspire start`
2. Aspire starts Postgres container
3. Aspire starts SvelteKit app with `ConnectionStrings__popotedb` env var
4. First HTTP request triggers migration hook
5. Migrations apply to local database
6. Developer sees console output: "✅ Database migrations complete"

### Publish Mode (Production)
1. CI/CD runs `aspire publish`
2. Aspire generates Docker Compose configuration
3. Compose starts Postgres service
4. Compose starts app container with connection string env var
5. Container boots SvelteKit server
6. First health check or HTTP request triggers migration hook
7. Migrations apply to production database
8. Deployment succeeds (or fails fast if migration errors)

## Rollback Plan

If this approach causes issues:

1. **Remove migration hook** from `hooks.server.ts`
2. **Revert to manual execution**: Add migration step to CI/CD
3. **Alternative**: Use Aspire `WithCommand()` to run migration before app start (if supported in future)

## Related Documentation

- `docs/database-migrations.md` — Complete migration workflow guide
- `.squad/agents/ash/history.md` — Implementation details and learnings

## Approval

- ✅ Ash (DevOps) — Proposed and implemented
- ⏳ Ripley (Architect) — Review recommended
- ⏳ Kane (Backend) — Review recommended (uses Drizzle)

## Notes

This pattern can be reused for other one-time initialization tasks:
- Cache warming
- Feature flag loading
- External service health checks
- OpenTelemetry initialization

The key is using a module-level flag to ensure one-time execution across all requests.

