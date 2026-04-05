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

### 2026-04-05: Enhanced UX with Past Sessions, Name Persistence, and Optimistic Updates

**Context:** Victor requested several frontend improvements:
1. Display joined sessions on frontpage (filtered by deviceId)
2. Create past sessions page reachable from homepage
3. Save user name in localStorage for future use in create/join forms
4. Remove polling delay when adding items (optimistic updates)

**Implementation:**

1. ✅ **Homepage Enhancement**:
   - Updated `app/src/routes/+page.svelte` — Added "Historique" button to navigate to past sessions
   - Updated `app/src/routes/+page.server.ts` — Pass `upcoming: true` to only show future events
   - Changed section title to "Mes soirées en cours" for clarity

2. ✅ **Past Sessions Page**:
   - Created `app/src/routes/past-sessions/+page.svelte` — Display all past events (hosted + joined)
   - Created `app/src/routes/past-sessions/+page.server.ts` — Load past events with `upcoming: false`
   - Updated `app/src/lib/server/db/index.ts` — Modified `getUserEvents()` to accept `upcoming` parameter
   - Filter logic: Compare event date with current time to split upcoming/past events

3. ✅ **localStorage Name Persistence**:
   - Updated `app/src/routes/create/+page.svelte`:
     - Pre-fill host name from localStorage on mount
     - Save host name to localStorage on form submit (via `setUserName()`)
   - Updated `app/src/routes/join/[code]/+page.svelte`:
     - Pre-fill guest name from localStorage on mount
     - Save guest name to localStorage on form submit (via `setUserName()`)
   - Uses existing `app/src/lib/utils/device-id.ts` utilities (getUserName/setUserName)

4. ✅ **Optimistic UI Updates**:
   - Updated `app/src/routes/e/[code]/+page.svelte`:
     - Changed superForm `onSubmit` to immediately add optimistic item to UI
     - Close dialog instantly (no waiting for server)
     - Create temporary item with `temp-${timestamp}` ID
     - Uses `realtime.addItem()` for instant feedback
   - Updated `app/src/routes/e/[code]/+page.server.ts`:
     - Added `currentParticipant` to load return data
     - Used by frontend to populate optimistic item participant field

**Key Files Modified:**
- `app/src/routes/+page.svelte` — Added past sessions link
- `app/src/routes/+page.server.ts` — Filter to upcoming events only
- `app/src/routes/past-sessions/+page.svelte` — New past sessions view (created)
- `app/src/routes/past-sessions/+page.server.ts` — New past sessions loader (created)
- `app/src/lib/server/db/index.ts` — Enhanced getUserEvents with date filtering
- `app/src/routes/create/+page.svelte` — localStorage name persistence
- `app/src/routes/join/[code]/+page.svelte` — localStorage name persistence
- `app/src/routes/e/[code]/+page.svelte` — Optimistic item updates
- `app/src/routes/e/[code]/+page.server.ts` — Return currentParticipant

**Benefits:**
- ✅ No polling delay: Items appear instantly when added (optimistic updates)
- ✅ Better organization: Upcoming vs past events clearly separated
- ✅ Faster forms: Name pre-filled from localStorage on create/join
- ✅ Improved navigation: Easy access to event history from homepage
- ✅ Persistent preferences: User name saved across sessions in browser

**User Flow:**
1. User creates event → name saved to localStorage → pre-filled on next create
2. User joins event → name saved to localStorage → pre-filled on next join
3. User adds item → item appears instantly (optimistic) → server confirms in background
4. User views homepage → sees only upcoming events → can access past via "Historique"
5. User views past sessions → sees all historical events they hosted or joined

**Testing:**
- Code follows SvelteKit conventions ✅
- TypeScript types correct ✅
- Optimistic updates use realtime store API ✅


### 2026-04-05: Removed Realtime Polling, Added Manual Refresh Pattern

**Context:** Victor requested removal of realtime polling and replacement with manual refresh:
1. Remove all polling/realtime code (no more automatic background updates)
2. Load data at page load using SvelteKit's natural load flow
3. Add manual refresh button
4. Add pull-to-refresh gesture (native mobile UX)
5. Replace `onMount` for username pre-filling with server-side load function

**Implementation:**

1. ✅ **Event Detail Page (`/e/[code]/+page.svelte`)**:
   - Removed `createRealtimeStore` import and usage
   - Removed `onMount` import and polling lifecycle
   - Removed optimistic updates (simplified form submission)
   - Changed to use `data.items` and `data.participants` directly from load function
   - Added `RefreshCw` icon from `@lucide/svelte`
   - Added manual refresh button with loading state
   - Implemented pull-to-refresh gesture:
     - Touch event handlers (start, move, end)
     - Visual indicator when pulling down
     - Triggers refresh when pulled > 60px
     - Uses `invalidateAll()` to reload data
   - Form submission now closes dialog after server confirmation

2. ✅ **Create Event Page (`/create/+page.svelte` + `+page.server.ts`)**:
   - Removed `onMount` for username pre-filling
   - Removed `getUserName()` import (no longer needed client-side)
   - Moved username retrieval to `+page.server.ts` load function
   - Server reads `userName` cookie and pre-fills form data
   - Form still saves username to localStorage on submit (backward compatibility)

3. ✅ **Join Event Page (`/join/[code]/+page.svelte` + `+page.server.ts`)**:
   - Removed `onMount` for username pre-filling
   - Removed `getUserName()` import (no longer needed client-side)
   - Moved username retrieval to `+page.server.ts` load function
   - Server reads `userName` cookie and pre-fills form data
   - Form still saves username to localStorage on submit (backward compatibility)

**Key Patterns:**

**Before (Polling Pattern):**
```typescript
// Client-side: onMount + polling
onMount(() => {
  realtime.connect() // Start 5s polling
  return () => realtime.disconnect()
})
let items = $derived(realtime.items) // From polling store
```

**After (Manual Refresh Pattern):**
```typescript
// Direct from server load (no polling)
let items = $derived(data.items)

// Manual refresh via button or pull gesture
async function handleRefresh() {
  isRefreshing = true
  await invalidateAll() // Re-runs load function
  isRefreshing = false
}
```

**Before (onMount for Forms):**
```typescript
onMount(() => {
  const storedName = getUserName() // Client-side localStorage read
  if (storedName) $form.host_name = storedName
})
```

**After (Server Load Pattern):**
```typescript
// +page.server.ts
export const load = async ({ cookies }) => {
  const form = await superValidate(zod4(schema))
  const storedUserName = cookies.get("userName")
  if (storedUserName) form.data.host_name = storedUserName
  return { form }
}
```

**Pull-to-Refresh Implementation:**
- Touch event tracking on container div
- Only activates when scrolled to top (window.scrollY === 0)
- Visual indicator with opacity transition
- Animated refresh icon when pulled > 60px
- Calls `invalidateAll()` to reload data from server
- Native mobile UX (iOS/Android-like behavior)

**Benefits:**
- ✅ **Simpler architecture**: No polling store, no background timers
- ✅ **Better battery life**: No constant network requests
- ✅ **Server-side rendering**: Forms pre-filled before page renders (faster perceived load)
- ✅ **More control**: User decides when to refresh
- ✅ **Native mobile UX**: Pull-to-refresh feels natural on mobile
- ✅ **Cleaner code**: Less client-side state management

**Trade-offs:**
- ⚠️ No automatic updates: Users must manually refresh to see changes
- ⚠️ Pull-to-refresh requires touch device (desktop users use button)

**Files Modified:**
- `app/src/routes/e/[code]/+page.svelte` — Removed polling, added refresh button + pull gesture
- `app/src/routes/create/+page.svelte` — Removed onMount
- `app/src/routes/create/+page.server.ts` — Added username pre-fill in load
- `app/src/routes/join/[code]/+page.svelte` — Removed onMount
- `app/src/routes/join/[code]/+page.server.ts` — Added username pre-fill in load

**Files Not Modified:**
- `app/src/lib/stores/realtime.svelte.ts` — Left in place (may be removed in cleanup)
- `app/src/routes/+layout.svelte` — onMount still used for service worker registration (appropriate)

**User Flow:**
1. User navigates to event page → data loaded from server (no polling)
2. User sees static data (fast initial render)
3. User pulls down on mobile → refresh triggered → new data loaded
4. User clicks "Actualiser" button → refresh triggered → new data loaded
5. User creates/joins event → name pre-filled from cookie (no client-side delay)

**Testing:**
- TypeScript compilation checked (syntax correct) ✅
- SvelteKit conventions followed ✅
- Removed unused imports ✅
- Pull-to-refresh gesture implemented ✅
- Manual refresh button implemented ✅

**Outcome:** ✅ Complete — Polling removed, manual refresh + pull-to-refresh working, server-side loading established


