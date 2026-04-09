# Backend Migration Summary — PocketBase → Drizzle + Postgres

**Completed by:** Kane (Backend)  
**Date:** 2026-03-23  
**Status:** Ready for implementation (pending approval)

---

## ✅ What's Done

### 1. Schema Design

- Migrated 3 PocketBase collections → 3 Postgres tables
- **Events:** name, date, location, description, host info, share_code (8 chars)
- **Participants:** device_id auth, is_host flag, event FK (cascade delete)
- **Items:** 7 categories, dual FK to events + participants (cascade delete)
- All relations, indexes, and constraints defined

### 2. Database Layer

Created 7 files in `app/db/`:

| File          | Purpose                                                      |
| ------------- | ------------------------------------------------------------ |
| `schema.ts`   | Drizzle table definitions + relations                        |
| `index.ts`    | Database client singleton (connection pool)                  |
| `migrate.ts`  | Migration runner (applies SQL migrations)                    |
| `utils.ts`    | Share code generation (ported from PocketBase hooks)         |
| `README.md`   | Complete documentation (quick start, usage, troubleshooting) |
| `EXAMPLES.ts` | SvelteKit route examples (7 patterns)                        |
| `SCRIPTS.md`  | npm scripts for database operations                          |

Plus `drizzle.config.ts` in app root.

### 3. Architecture Decisions

Documented in `.squad/decisions/inbox/kane-backend-architecture.md`:

- Device ID authentication strategy (anonymous, no accounts)
- API patterns for SvelteKit (load functions + form actions)
- Real-time sync approach (polling → WebSockets phased migration)
- Drizzle vs PocketBase trade-offs analysis
- Migration cost estimation (2-3 days)

### 4. Questions for Victor

Added 2 questions to `docs/questions-for-victor.md`:

- Data migration strategy (fresh start vs export/import)
- Real-time sync latency target (2-3s polling vs sub-second WebSocket)

---

## 🚧 What's Next

### Phase 1: Setup (1 day)

- [ ] Install dependencies: `drizzle-orm`, `postgres`, `drizzle-kit`, `tsx`
- [ ] Add database scripts to `package.json`
- [ ] Generate initial migration: `pnpm db:generate`
- [ ] Start Aspire: `pnpm aspire start`
- [ ] Run migrations: `pnpm db:migrate`
- [ ] Verify tables in Postgres

### Phase 2: Authentication (0.5 day)

- [ ] Create `src/lib/auth.ts` (device ID generation)
- [ ] Add SvelteKit hooks (`src/hooks.server.ts`)
- [ ] Add TypeScript definitions (`src/app.d.ts`)

### Phase 3: API Implementation (1.5 days)

- [ ] Create event routes (create, view by share code)
- [ ] Join event route (create participant)
- [ ] Add item routes (create, delete with ownership check)
- [ ] Test all CRUD operations

### Phase 4: Real-time Sync (0.5 day)

- [ ] Implement 2-second polling in event detail page
- [ ] Test sync latency with multiple clients
- [ ] (Optional) Add WebSocket support if polling is too slow

### Phase 5: Testing (1 day)

- [ ] Unit tests: share code generation, validation
- [ ] Integration tests: event creation flow
- [ ] Manual testing: multi-device sync

**Total Estimate:** 4.5 days

---

## 📊 Key Differences from PocketBase

| Aspect          | PocketBase            | Drizzle + Postgres         |
| --------------- | --------------------- | -------------------------- |
| **Database**    | SQLite (embedded)     | PostgreSQL (Aspire)        |
| **Schema**      | JavaScript migrations | TypeScript Drizzle schema  |
| **Auth**        | Built-in + device ID  | Device ID only (custom)    |
| **Real-time**   | SSE (built-in)        | Polling (manual)           |
| **Admin UI**    | Built-in dashboard    | Drizzle Studio or pg-admin |
| **Deployment**  | Single binary         | Aspire multi-container     |
| **Type Safety** | None                  | Full TypeScript            |
| **Scalability** | ~10K events           | Millions of rows           |

---

## 🎯 Migration Strategy

### Option A: Start Fresh (Recommended)

- No data to migrate (early stage project)
- Run migrations on empty Postgres database
- Test with sample data

### Option B: Migrate Existing Data

1. Export PocketBase data: `sqlite3 pb_data/data.db .dump`
2. Transform schema: 15-char IDs → serial, field name mapping
3. Import to Postgres: seed script or SQL import
4. Verify data integrity

**Recommendation:** Start fresh unless production users exist.

---

## 🔐 Device ID Authentication Flow

1. **Client generates UUID** (crypto.randomUUID())
2. **Store in localStorage** (`popote_device_id`)
3. **Sync to cookie** (for SSR)
4. **Server reads cookie** (SvelteKit hooks)
5. **Attach to request** (`event.locals.deviceId`)
6. **Verify ownership** (compare device_id in database)

**Security Note:** Device IDs are UUIDs (128-bit) — hard to guess but not cryptographically secure. For MVP this is acceptable. Future: add optional email/phone verification.

---

## 🔄 Real-time Sync Options

### Option 1: Polling (MVP)

```typescript
setInterval(() => {
  invalidate("event:data"); // Re-run load function
}, 2000); // 2 second interval
```

**Pros:** Simple, no server changes, meets "< 2s sync" requirement  
**Cons:** More database queries, not "instant"

### Option 2: WebSockets (Phase 2)

```typescript
io.on("connection", (socket) => {
  socket.on("subscribe:event", (eventId) => {
    socket.join(`event:${eventId}`);
  });
});
```

**Pros:** Instant sync, bi-directional  
**Cons:** Complex, requires Redis for scaling, persistent connections

### Recommendation

Start with polling. Upgrade to WebSockets only if user testing shows it's too slow.

---

## 📚 Documentation Created

1. **`app/db/README.md`** — Complete database guide
   - Quick start
   - Schema reference
   - Query examples
   - Troubleshooting

2. **`app/db/EXAMPLES.ts`** — SvelteKit route examples
   - Create event with auto-participant
   - View event by share code
   - Add/delete item with ownership check
   - Join event (create participant)
   - Device ID hooks
   - Real-time polling

3. **`app/db/SCRIPTS.md`** — npm scripts guide
   - db:generate, db:migrate, db:studio
   - Workflow recommendations
   - Dependency installation

4. **`.squad/decisions/inbox/kane-backend-architecture.md`** — Architecture decisions
   - Drizzle vs PocketBase analysis
   - Device ID auth strategy
   - Real-time sync options
   - Migration cost estimation
   - Open questions

---

## ✅ Team Handoff

### For Dallas (SvelteKit Frontend)

- Review `app/db/EXAMPLES.ts` for API patterns
- Use `getDb()` from `$lib/server/db` for queries
- Follow load function + form action pattern
- Device ID managed via `$lib/auth.ts`

### For Victor (Product)

- Review `.squad/decisions/inbox/kane-backend-architecture.md`
- Answer questions in `docs/questions-for-victor.md`
- Approve migration strategy (fresh start vs data import)
- Confirm real-time sync latency requirements

### For Ripley (Architect)

- Review schema design in `app/db/schema.ts`
- Validate cascade delete strategy
- Approve Aspire connection string injection approach
- Review real-time sync options (polling vs WebSocket)

---

## 🚨 Blockers

- **None** — Can proceed with implementation immediately
- Waiting on Victor's approval for data migration strategy
- Waiting on Victor's confirmation of sync latency requirements

---

## 📞 Questions?

See:

- `app/db/README.md` — Database documentation
- `app/db/EXAMPLES.ts` — Code examples
- `.squad/decisions/inbox/kane-backend-architecture.md` — Full analysis
- `docs/questions-for-victor.md` — Open questions

---

**Status:** ✅ Schema complete, ready for implementation  
**Next Step:** Install dependencies and generate migrations  
**ETA:** 4.5 days from approval to production-ready backend
