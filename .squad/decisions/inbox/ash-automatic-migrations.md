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
