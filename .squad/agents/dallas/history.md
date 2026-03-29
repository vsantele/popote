# Dallas — History

## Project Context

- **Project:** popote
- **Stack:** SvelteKit (TypeScript), shadcn-svelte (UI), Drizzle ORM + Postgres (backend)
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, web-first (PWA), temps réel
- **User:** Victor
- **Created:** 2026-03-22
- **Migration:** Flutter → SvelteKit (2026-03-23)

**My focus:** SvelteKit frontend, shadcn-svelte components, state management (Svelte 5 runes), PWA, device ID management

**Key UI screens:**

- `/` — Home (create or join event)
- `/create` — Create event form (host provides name)
- `/join/[code]` — Join event form (guest provides name once)
- `/e/[code]` — Event detail with items (toggle category/person view)
- Add item dialog (modal, no name required)

## Core Context

### Architecture Migration (2026-03-22 → 2026-03-24)

Migrated from Flutter + PocketBase to SvelteKit + Drizzle + Postgres.

**Previous work (Flutter, 2026-03-22):**
- Initialized project structure with Riverpod state management
- Built 5 main screens (home, create, event detail, participant list, item management)
- Integrated Material 3 design language
- Implemented device ID + localStorage for anonymous users
- Created GoRouter deep linking handler for share codes
- PocketBase service stubs ready for integration
- Compiled successfully, ready for backend integration

**Current work (SvelteKit, 2026-03-23 → present):**
- Full frontend rewrite with SvelteKit + TypeScript
- Replaced Riverpod with Svelte 5 runes (`$state`, `$derived`)
- Integrated Superforms for type-safe form handling with Zod validation
- Device ID management: localStorage (client) + httpOnly cookies (server actions)
- Real-time updates via 5-second polling
- Removed all PocketBase references
- PWA support via @vite-pwa/sveltekit
- Aspire integration for local development environment

**Key Routes:**
- `/+page.svelte` — Home with create/join entry points, session list
- `/create/+page.svelte` — Event creation form
- `/e/[code]/+page.svelte` — Event detail with item management
- `/join/[code]/+page.svelte` — Guest name collection on join

**State Management (Svelte 5 Runes):**
- Local reactive state via `$state` rune
- Computed values via `$derived` rune
- Context API for cross-component stores
- Server data via `+page.server.ts` load functions

**Database Integration:**
- Drizzle ORM for type-safe queries
- Postgres (orchestrated via .NET Aspire)
- Device ID-based anonymous auth (no accounts required)
- Real-time data via polling REST API
- Share codes for guest joining

**PWA Capabilities:**
- Offline support (service worker)
- Installable on mobile/desktop
- Share code deep linking: `https://popote.io/s/{code}`
- Works on desktop, mobile, tablet without app store

## Learnings

### 2026-03-29: Streamlined Name Collection Flow

**Context:** Victor requested to fix the name collection UX:
- Host should keep name from room creation
- Guests should provide name ONCE when joining (not when adding items)
- Adding items should never ask for name

**Implementation:**

1. ✅ Created new `/join/[code]` route:
   - `+page.svelte` — Simple form asking for guest name
   - `+page.server.ts` — Validates event exists, creates participant, stores userName in cookie
   - Redirects to event page after successful join
   - Smart redirect: if userName cookie exists, skip straight to event

2. ✅ Updated home page (`/+page.svelte`):
   - "Join event" now redirects to `/join/[code]` instead of `/e/[code]`
   - Forces name collection before viewing event

3. ✅ Updated event detail page (`/e/[code]`):
   - Server (`+page.server.ts`):
     - Added check: if no userName cookie and not host, redirect to `/join/[code]`
     - Removed userName pre-fill logic from form init
   - Client (`+page.svelte`):
     - Removed `participant_name` field from add item dialog
     - Form now only asks for item details (name, category, quantity)

4. ✅ Updated add item schema (`item.schema.ts`):
   - Removed `participant_name` field requirement
   - Schema now only validates item data

5. ✅ Updated addItem action (`/e/[code]/+page.server.ts`):
   - Changed logic to use userName from cookies instead of form data
   - Added defensive check: creates participant if doesn't exist (edge case)
   - Returns 401 error if no userName/deviceId (should never happen with load guard)

**Flow Summary:**

- **Host**: Provides name on `/create` → stored in cookie → can add items freely
- **Guest**: Joins via code → redirected to `/join/[code]` → provides name → stored in cookie → redirected to event → can add items freely
- **Adding Items**: No name field, uses stored userName from cookie automatically

**Key Files Modified:**
- `app/src/routes/+page.svelte` — Updated join redirect
- `app/src/routes/join/[code]/+page.svelte` — New join form (created)
- `app/src/routes/join/[code]/+page.server.ts` — New join logic (created)
- `app/src/routes/e/[code]/+page.svelte` — Removed name field from item form
- `app/src/routes/e/[code]/+page.server.ts` — Added name guard in load, updated addItem action
- `app/src/lib/schemas/item.schema.ts` — Removed participant_name field

**Benefits:**
- Improved UX: Users only provide name once at the right time
- Cleaner item form: Faster to add items without repetitive name entry
- Better flow: Clear distinction between joining and participating
- Secure: userName stored in httpOnly cookie (server-side)

**Testing:**
- Dev server starts successfully ✅
- TypeScript compiles without errors in new routes ✅
- Routes follow SvelteKit conventions ✅


