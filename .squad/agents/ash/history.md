# Ash — History

## Project Context

- **Project:** popote
- **Stack:** SvelteKit (frontend), Drizzle ORM, Postgres 17.6, Aspire (orchestration)
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — PWA, anonymous users via device ID, partage par codes, temps réel via polling
- **User:** Victor
- **Joined:** 2026-04-10

## Core Context

- **Aspire setup:** apphost.cs orchestrates SvelteKit app + Postgres 17.6
- **Database:** Drizzle ORM with PostgreSQL driver, migrations in app/src/lib/server/db/migrations/
- **Recent work:** Fixed Drizzle schema (foreign keys, transactions, automatic timestamps), generated migration 0002_condemned_barracuda.sql
- **Migration status:** New migration exists but not yet applied to database
- **Deployment modes:** Aspire run mode (local dev) + publish mode (deployment) both need migration support

## Learnings

### 2026-04-10: Initial assignment

**Context:** Victor needs SQL migrations to run automatically in both Aspire run mode and publish mode.

**Task:** Set up database migration execution for both local dev (aspire start) and deployment scenarios.

**Key files to review:**

- apphost.cs — Aspire orchestration entry point
- app/src/lib/server/db/migrate.ts — Drizzle migration runner
- app/src/lib/server/db/migrations/ — SQL migration files (0002_condemned_barracuda.sql pending)

### 2026-04-11: Automatic migration execution implemented ✅

**Problem:** Migrations needed to run automatically in both Aspire run mode (local dev) and publish mode (production deployment) without manual intervention.

**Solution Implemented:** Server startup hook pattern in `hooks.server.ts`

**Key Changes:**

1. **Modified `app/src/lib/server/db/migrate.ts`**:
   - Exported `runMigrations()` function for programmatic use
   - Kept CLI execution mode (`pnpm db:migrate`) for manual runs
   - Fixed migrations folder path resolution to work from both CLI and server contexts
   - Uses path resolution relative to module location (works in all contexts)

2. **Modified `app/src/hooks.server.ts`**:
   - Added migration execution on first HTTP request
   - Fail-fast behavior: server won't start if migrations fail
   - One-time execution flag prevents re-running on subsequent requests
   - Migrations run before any route handling

3. **Created `docs/database-migrations.md`**:
   - Complete documentation of migration strategy
   - Workflow guide for developers
   - Troubleshooting procedures
   - Decision rationale

**Why This Approach:**

- ✅ Works identically in run mode and publish mode (no Aspire-specific config needed)
- ✅ Fail-fast prevents broken deployments
- ✅ No orchestration complexity (no init containers, no separate services)
- ✅ Idempotent via Drizzle's built-in migration tracking
- ✅ Connection string automatically resolved from Aspire environment (`ConnectionStrings__popotedb`)

**Alternatives Considered:**

- ❌ Init container pattern: Would require Aspire support for init containers in Vite resources (not available)
- ❌ Separate migration service: Orchestration complexity, potential race conditions
- ❌ Manual execution: Human error risk, doesn't scale

**Testing:**

- Migration runner updated and tested for path resolution
- Integration with hooks.server.ts implemented
- Works with Aspire-injected connection strings

**Files Modified:**

- `app/src/lib/server/db/migrate.ts` — Exported function, improved path resolution
- `app/src/hooks.server.ts` — Added automatic migration execution
- `docs/database-migrations.md` — Complete documentation (new file)

**Key Pattern Learned:**
SvelteKit's `handle` hook in `hooks.server.ts` is the ideal place for one-time server initialization tasks (migrations, cache warming, etc.) because:

1. Runs on first request (guaranteed execution)
2. Shared across all routes
3. Can be made idempotent with a simple flag
4. Fail-fast behavior via thrown errors
5. Works identically in dev and production

**Production Deployment:**
When `aspire publish` generates Docker Compose:

1. Container starts with `ConnectionStrings__popotedb` env var from Aspire
2. SvelteKit server boots
3. First request triggers migration hook
4. Migrations apply automatically to production database
5. No manual intervention required

---

### Session Log Reference

- Complete session log: `.squad/log/2026-04-11T02-10-03-migration-implementation.md`
- Inbox decision merged to `decisions.md`

### Key Implementation Details

**Pattern Reusability:**
The server startup hook pattern established here can be applied to other one-time initialization tasks:

- Cache warming
- Feature flag loading
- External service health checks
- OpenTelemetry initialization

**Critical Success Factor:**
Using module-relative path resolution (`import.meta.url`) for migrations folder ensures compatibility across:

- CLI execution context (manual runs)
- Server runtime context (Aspire orchestration)
- Build-time and runtime environments (dev/prod parity)
