# API Routes - Migration Note

## Status: NOT IMPLEMENTED

The files in `src/routes/api/` are stubs for a **future Drizzle + Postgres migration**.

**Current Implementation (Dallas - Frontend):**

- Uses **PocketBase** directly via `$lib/services/pocketbase.ts`
- No custom API routes needed (PocketBase provides REST API)
- All requests go directly to PocketBase at `http://127.0.0.1:8090/api/collections/...`

**These API routes require:**

- `$lib/server/db` - Database connection module (not created yet)
- `$lib/server/db/schema` - Drizzle schema definitions (not created yet)
- `$lib/server/db/utils` - Database utilities (not created yet)

**Why they exist:**
These were part of an earlier architecture decision to migrate from PocketBase to Postgres + Drizzle. The migration has not been completed, and the current frontend implementation works directly with PocketBase.

**Next Steps (if migration proceeds):**

1. Kane (Backend) needs to implement Drizzle schemas
2. Create database connection module
3. Implement API routes to wrap database operations
4. Update frontend to use these API routes instead of PocketBase directly

**For now:**

- These files should be **ignored or deleted**
- Frontend uses PocketBase service layer directly
- No impact on current functionality
