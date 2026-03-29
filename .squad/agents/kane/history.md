# Kane — History

## Project Context

- **Project:** popote
- **Stack:** Backend: Drizzle ORM + Postgres (via .NET Aspire). Frontend: SvelteKit
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, web-first (PWA), temps réel
- **User:** Victor
- **Created:** 2026-03-22
- **Migration:** PocketBase → Postgres (2026-03-23)

**My focus:** Database schema, API routes, device ID authentication, real-time data, session management

**Core API Routes:**
- `GET /api/events/{code}` — Fetch event with participants and items
- `POST /api/events` — Create new event
- `POST /api/items` — Add item to event
- `GET /api/sessions/user/{device_id}` — Fetch user's created/joined sessions
- `POST /api/participants` — Join event as guest

**Database Schema (Postgres):**
- `events` — id, name, code, host_device_id, date, location, created
- `participants` — id, event_id, device_id, name, is_host, created
- `items` — id, event_id, participant_id, name, category, quantity, created

**Categories (enum):** apero, entree, plat, dessert, boissons, jeux, autre

## Core Context

### Backend Architecture Migration (2026-03-22 → 2026-03-24)

Migrated from PocketBase to Postgres + Drizzle ORM orchestrated via .NET Aspire.

**Previous work (PocketBase, 2026-03-22):**
- Designed schema with 3 collections (events, participants, items)
- Implemented JavaScript hooks for share code generation (6-char alphanumeric, auto-unique)
- Implemented auto-participant creation for event hosts
- Designed device-based auth (device_id in participants table, no accounts required)
- Planned real-time sync via Server-Sent Events (SSE)
- Created migration guides for deep linking and category management
- Cascade delete enabled for data integrity
- Postgres instance deployed successfully

**Current work (Postgres + Drizzle, 2026-03-23 → present):**
- Migrated schema from PocketBase to Postgres with Drizzle ORM
- Removed PocketBase hooks, implemented API routes via SvelteKit instead
- Created `/api/events` CRUD routes with device ID validation
- Implemented `/api/sessions/user/{device_id}` for session listing
- Removed server-side share code generation (now client-side or deterministic)
- Set up Aspire orchestration for Postgres container
- TypeScript type safety via Drizzle schema definitions
- Device ID-based authentication (no server sessions required)
- Real-time data via 5-second polling (upgrade path: WebSockets)

**Key API Routes (SvelteKit +server.ts):**
- `GET /api/events/{code}` — Fetch event with participants and items
- `POST /api/events` — Create new event
- `POST /api/items` — Add item to event
- `GET /api/sessions/user/{device_id}` — Fetch user's created/joined sessions
- `POST /api/participants` — Join event as guest

**Database Schema (Postgres):**
- `events` — id, name, code, host_device_id, date, location, created
- `participants` — id, event_id, device_id, name, is_host, created
- `items` — id, event_id, participant_id, name, category, quantity, created
- Categories: apero, entree, plat, dessert, boissons, jeux, autre

**Authentication Strategy:**
- Device-based (device_id from browser localStorage or cookie)
- Stateless operations (no server sessions)
- No accounts required (zero friction for guests)

**Observability:**
- Aspire dashboard for traces, logs, metrics
- OpenTelemetry integration built-in
- Postgres query monitoring via Drizzle integration

## Learnings

### 2026-03-29: Session List and Device ID Tracking

**Context:** Victor requested to add a session list to home page showing created/joined events per device_id.

**Implementation:**

1. ✅ Created device_id-based session tracking:
   - Sessions fetched from database filtered by device_id
   - Home page displays two lists: "Created Events" (host role) and "Joined Events" (guest role)
   - Real-time updates via 5-second polling

2. ✅ Updated home page (`/+page.svelte`):
   - Fetches device_id from localStorage
   - Calls `/api/sessions/user/{device_id}` to get user's events
   - Renders SessionList component with created/joined separation
   - "Create new" and "Join new" buttons for navigation

3. ✅ Added SessionList component:
   - Displays created events (where device_id is host)
   - Displays joined events (where device_id is participant but not host)
   - Links to `/e/[code]` for existing events
   - Shows event metadata (name, date, participant count)
