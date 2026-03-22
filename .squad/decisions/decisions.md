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

## Frontend Architecture: Flutter + GoRouter + Riverpod

**Date:** 2026-01-22  
**Status:** ✅ Team Aligned

Use Flutter stack:
- **Navigation:** GoRouter for deep linking (share codes → events)
- **State:** Riverpod for SSE subscription management
- **UI:** Material 3 design system
- **Device ID:** SharedPreferences for persistence
- **Real-time:** StreamProvider to consume PocketBase SSE

---
