# Popote — Codebase Audit Report

**Date:** 2026-03-23  
**Auditor:** Ripley (Technical Lead)  
**Scope:** Full app directory scan for placeholders, missing implementations, and incomplete features

---

## Executive Summary

The codebase is **60% migrated** from PocketBase to PostgreSQL:

- ✅ **API layer** fully migrated to Drizzle ORM + PostgreSQL
- ❌ **Frontend pages** still use deprecated PocketBase client
- ❌ **Real-time sync** still polls old PocketBase endpoints

**Critical Action Required:** Complete backend migration to make app functional. Estimated effort: **1 day**.

---

## 🔴 CRITICAL ISSUES (Blocks Core Functionality)

### 1. Database Import Path Mismatch

**File:** `app/src/lib/db/index.ts`  
**Lines:** 1-9  
**Issue:** File is empty stub with `export {}` and TODO comment  
**Impact:** Confusion about which database client to use  
**Root Cause:** Placeholder created during migration, never implemented

```typescript
// Current state (BROKEN):
// TODO: Implement Drizzle schema and utilities
export {}
```

**Fix:** Re-export from `/app/db/index.ts` (the real database client) OR remove file entirely

---

### 2. Incomplete Backend Migration — Page Routes Still Use PocketBase

**Files Affected:**

- `app/src/routes/create/+page.server.ts` (lines 5, 34)
- `app/src/routes/e/[code]/+page.server.ts` (lines 3-8, 19-108)
- `app/src/lib/stores/realtime.svelte.ts` (line 3)

**Current State:**

```typescript
// app/src/routes/create/+page.server.ts
import { createEvent } from "$lib/services/pocketbase" // ❌ OLD BACKEND
```

**Should Be:**

```typescript
import { createEvent } from "$lib/server/db" // ✅ NEW BACKEND (PostgreSQL)
```

**Impact:**

- Event creation form writes to PocketBase (non-existent) instead of PostgreSQL
- Event detail page reads from PocketBase (non-existent) instead of PostgreSQL
- Real-time sync polls wrong endpoints
- **App is non-functional end-to-end**

**Why This Happened:**  
API routes (`/api/events`, `/api/items`) were rewritten to use PostgreSQL, but frontend pages weren't updated.

---

### 3. PocketBase Service Still Active (Should Be Deleted)

**File:** `app/src/lib/services/pocketbase.ts` (191 lines)  
**Functions:** `getEventByShareCode`, `createEvent`, `getParticipants`, `createParticipant`, `getItems`, `createItem`, `updateItem`, `deleteItem`  
**Issue:** Full REST client for deprecated PocketBase backend  
**Impact:** Actively imported by page routes; causes confusion and maintenance burden  
**Fix:** Delete entire file after page routes migrated

---

### 4. Hardcoded Localhost URLs

**Files:**

- `app/src/lib/api.ts` (line 6): `'http://127.0.0.1:8090'`
- `app/src/lib/services/pocketbase.ts` (line 5): `'http://127.0.0.1:8090'`
- `app/.env.example` (line 4): `VITE_POCKETBASE_URL=http://127.0.0.1:8090`

**Issue:** Development config hardcoded in production code  
**Impact:** Incorrect endpoints, potential production failures  
**Fix:** Remove PocketBase references; PostgreSQL connection string managed by Aspire

---

## 🟡 IMPORTANT ISSUES (Needed for MVP)

### 5. Backup Files Not Cleaned Up

**Files:**

- `app/src/routes/api/events/+server.ts.backup` (79 lines)
- `app/src/routes/api/items/+server.ts.backup` (identical to current)

**Issue:** Leftover backup files from refactoring  
**Impact:** Confuses developers, bloats codebase  
**Fix:** Delete both files (current versions are correct)

---

### 6. Rate Limiting Not Implemented

**File:** `app/API_ROUTES.md` (line 382)  
**Documentation:** "Rate Limiting: Not yet implemented (TODO)"  
**Issue:** API routes have no throttling  
**Impact:** Vulnerable to abuse (spam event creation, denial of service)  
**Fix:** Add rate limiting middleware in SvelteKit hooks (e.g., 10 requests/minute per IP)

---

### 7. Polling Store Has No Retry Logic

**File:** `app/src/lib/stores/realtime.svelte.ts` (lines 44-49)  
**Issue:** Errors caught and logged but no retry/backoff  
**Impact:** Temporary network failures break real-time sync permanently  
**Current Code:**

```typescript
catch (err) {
  lastError = String(err);
  log('warn', 'Realtime refresh failed', { error: lastError });
  // No retry! Polling continues but state goes stale
}
```

**Fix:** Implement exponential backoff (retry after 5s, 10s, 20s, 40s, max 2 minutes)

---

### 8. localStorage Access Lacks Error Boundaries

**File:** `app/src/lib/utils/device-id.ts` (lines 15-18)  
**Issue:** Sets localStorage without try-catch  
**Impact:** Throws uncaught errors in SSR or private browsing mode  
**Current Code:**

```typescript
localStorage.setItem("deviceId", deviceId) // ❌ Can throw
```

**Fix:** Wrap in try-catch, handle SSR gracefully

---

## 🟢 NICE-TO-HAVE (Polish/Future Work)

### 9. Icon Assets Pending

**File:** `app/static/ICONS-README.md` (lines 5-9)  
**Issue:** "SVG placeholder icons are currently in place" + "TODO: Generate PNG Icons"  
**Impact:** PWA install experience not optimal (SVG works but PNG preferred)  
**Fix:** Generate multi-resolution PNG icons (192x192, 512x512) for `manifest.json`

---

### 10. Test Coverage Incomplete

**File:** `app/TEST_README.md` (lines 153-165)  
**Issue:** Component and integration tests marked "TODO"  
**Impact:** Reduced confidence in deployments  
**Fix:** Implement missing test suites (delegate to Lambert)

---

### 11. Performance Monitoring Not Instrumented

**File:** `app/src/lib/utils/logger.ts` (line 42)  
**Issue:** `performance.getEntriesByType()` not null-checked  
**Impact:** Could throw if performance API unavailable (rare edge case)  
**Fix:** Add null check: `if (typeof performance !== 'undefined' && performance.getEntriesByType) { ... }`

---

## ✅ NON-ISSUES (Legitimate Code)

These were flagged during scan but are **intentional and correct**:

- **UI placeholder text** (e.g., `placeholder="ABC123"` in forms) — Standard UX pattern
- **Test mock data** (`app/src/lib/test/mockData.ts`) — Proper test fixtures
- **API error handling** (400/404/500 responses) — Correctly implemented
- **Database schema** (`app/db/schema.ts`) — Clean, well-documented, production-ready
- **Connection string converter** (`app/db/index.ts`) — Working as designed (Aspire integration)

---

## Architecture Status Table

| Layer                 | PostgreSQL (New)               | PocketBase (Old)       | Migration Status  |
| --------------------- | ------------------------------ | ---------------------- | ----------------- |
| **Database**          | ✅ Drizzle ORM + Postgres      | ❌ SQLite (deprecated) | ✅ COMPLETE       |
| **API Routes**        | ✅ `/api/events`, `/api/items` | N/A                    | ✅ COMPLETE       |
| **Page Routes**       | ❌ Not using PostgreSQL        | ❌ Using PocketBase    | ❌ **INCOMPLETE** |
| **Real-time Sync**    | ❌ Polls old endpoints         | ❌ Active              | ❌ **INCOMPLETE** |
| **Connection String** | ✅ Aspire-injected             | N/A                    | ✅ COMPLETE       |

---

## Recommended Action Plan

### Phase 1: Complete Backend Migration 🔴 CRITICAL

**Owner:** Kane (Backend Lead)  
**Timeline:** 1 day

1. ✅ Create database adapter at `app/src/lib/db/index.ts`
   - Re-export from `/app/db/index.ts`
   - Add query helpers: `getEventByShareCode()`, `createEventWithHost()`, etc.

2. ✅ Rewrite `app/src/routes/create/+page.server.ts`
   - Replace PocketBase imports with PostgreSQL queries
   - Test event creation form

3. ✅ Rewrite `app/src/routes/e/[code]/+page.server.ts`
   - Replace PocketBase imports with PostgreSQL queries
   - Test event detail page and item creation

4. ✅ Update `app/src/lib/stores/realtime.svelte.ts`
   - Poll `/api/events/[code]` instead of PocketBase endpoints
   - Test 5-second polling works

5. ✅ Delete deprecated files:
   - `app/src/lib/services/pocketbase.ts`
   - `app/src/routes/api/events/+server.ts.backup`
   - `app/src/routes/api/items/+server.ts.backup`
   - PocketBase config from `.env.example`

**Success Criteria:**

- Event creation form writes to PostgreSQL ✅
- Event detail page reads from PostgreSQL ✅
- Real-time sync polls PostgreSQL API ✅
- All tests pass (`npm test`) ✅

---

### Phase 2: Cleanup & Hardening 🟡 IMPORTANT

**Owner:** Dallas (Frontend Lead)  
**Timeline:** 0.5 days

6. ✅ Add rate limiting (SvelteKit hooks)
   - Throttle: 10 requests/minute per IP
   - Apply to: `/api/events`, `/api/items`

7. ✅ Add retry logic to polling store
   - Exponential backoff: 5s, 10s, 20s, 40s, 60s (max)
   - Reset backoff on successful poll

8. ✅ Wrap localStorage calls in error boundaries
   - Try-catch in `device-id.ts`
   - Handle SSR edge case

**Success Criteria:**

- API rate limiting prevents abuse ✅
- Real-time sync recovers from network failures ✅
- No crashes in SSR or private browsing mode ✅

---

### Phase 3: Polish 🟢 NICE-TO-HAVE

**Owner:** Dallas (Frontend Lead)  
**Timeline:** 1 day (defer to post-MVP)

9. ⏸️ Generate PNG icon assets (192x192, 512x512)
10. ⏸️ Complete component test coverage (Lambert)
11. ⏸️ Add performance instrumentation (null checks)

---

## Key Decisions for Victor

### Decision 1: Migration Approach (URGENT)

**Question:** Complete migration to PostgreSQL or maintain dual backend temporarily?

**Option A (Recommended):** Complete migration in Phase 1

- ✅ Simplifies architecture
- ✅ Eliminates maintenance burden
- ✅ 1 day effort

**Option B (Not Recommended):** Keep both backends with feature flag

- ❌ Doubles complexity
- ❌ Requires data sync
- ❌ Delays full migration

**Your Decision:** ********\_\_********

---

### Decision 2: Priority Order (IMPORTANT)

**Question:** Which phases to implement before launch?

**Recommended:**

- ✅ Phase 1 (Migration) — **CRITICAL**, blocks app functionality
- ✅ Phase 2 (Hardening) — **IMPORTANT**, prevents abuse and bugs
- ⏸️ Phase 3 (Polish) — **NICE-TO-HAVE**, defer to post-MVP

**Your Decision:** ********\_\_********

---

## Testing Checklist (After Phase 1)

- [ ] Event creation form writes to PostgreSQL
- [ ] Event detail page reads from PostgreSQL
- [ ] Real-time sync polls PostgreSQL API (5s interval)
- [ ] Share code links work (`/e/ABC123`)
- [ ] Device ID persists across sessions (localStorage)
- [ ] Host participant auto-created on event creation
- [ ] All automated tests pass (`npm test`)
- [ ] Manual QA checklist complete (see `docs/stack-verification.md`)

---

## Files for Reference

**Current State:**

- ✅ Working DB client: `app/db/index.ts` (84 lines, Drizzle ORM)
- ✅ Working API routes: `app/src/routes/api/events/+server.ts`, `app/src/routes/api/items/+server.ts`
- ❌ Broken DB stub: `app/src/lib/db/index.ts` (9 lines, empty)
- ❌ Broken page routes: `app/src/routes/create/+page.server.ts`, `app/src/routes/e/[code]/+page.server.ts`
- ❌ Deprecated client: `app/src/lib/services/pocketbase.ts` (191 lines, DELETE)

**Documentation:**

- Migration plan: `docs/migration-plan.md`
- Stack verification: `docs/stack-verification.md`
- Aspire setup: `docs/aspire-setup.md`
- Decision record: `.squad/decisions/inbox/ripley-complete-migration.md` (NEW)

---

## Summary

The app infrastructure is **excellent** (Aspire, Postgres, Drizzle), but the frontend is still calling the old backend. Migration is 60% complete — we need 1 day to finish and make the app fully functional.

**Next Steps:**

1. Victor approves migration plan
2. Kane implements Phase 1 (1 day)
3. Test full stack integration
4. Launch MVP 🚀
