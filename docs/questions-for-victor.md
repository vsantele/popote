# Questions for Victor

**Date:** 2026-03-22 (Updated: 2026-03-23)  
**From:** Ripley (Lead)  
**Status:** Awaiting Response  

---

## ⚠️ NEW: Critical Fix Applied (2026-03-23)

**Issue:** Aspire provides connection strings in .NET format (`Host=localhost;Port=5432;...`) but the `postgres` npm library expects PostgreSQL URL format (`postgresql://user:pass@host:port/db`).

**Fix:** Added `convertConnectionString()` helper in `app/db/index.ts` that automatically detects and converts formats.

**Action Required:** Restart Aspire to load the fix:
```bash
npm run dev  # In project root
```

See `docs/stack-verification.md` for full details.

---

## Context

You pivoted the project from Flutter+PocketBase to SvelteKit+Drizzle+Postgres. I've analyzed the old implementation and created a migration plan. Below are questions I need answered before finalizing architecture decisions.

---

## 1. Share Code Format

**Old implementation:** 6-character alphanumeric (uppercase) — e.g., `ABC123`

**Question:** Should we keep 6-char format, or increase to 8-char for better collision resistance?

**Trade-offs:**
- 6-char: Easier to type/share verbally, ~2 billion combinations (sufficient for MVP scale)
- 8-char: Better collision resistance, harder to type/share verbally

**My recommendation:** Keep 6-char for MVP (collision risk is negligible at <10K events).

**Your decision:** 6-char is fine

---

## 2. Real-Time Sync Latency

**Old implementation:** PocketBase SSE (instant push notifications)

**New options:**
- **Polling (5s):** Simple, no server changes, 5-second latency
- **WebSockets:** Complex setup, instant sync, stateful server
- **SSE:** Push-based, requires server endpoint, HTTP/1.1 compatible

**Question:** Is 5-second polling acceptable for MVP, or must we have instant sync?

**Context:** Meal planning is not a "live editing" use case like Google Docs. Users won't notice 5s latency.

**My recommendation:** Start with 5s polling for MVP. Upgrade to WebSockets only if user feedback demands it.

**Your decision:** 5-second polling is acceptable for MVP

---

## 3. Offline Support (PWA)

**Old implementation:** Flutter app works offline (local SQLite cache), but no offline write (API calls fail without network).

**Question:** Should the SvelteKit PWA work fully offline, or is online-only acceptable?

**Trade-offs:**
- **Online-only:** Simple, no sync conflicts, requires network
- **Offline writes:** Complex (queue writes, sync when back online), better UX

**My recommendation:** Online-only for MVP. PWA can cache read-only data (event details, items list) for faster load, but writes require network.

**Your decision:** do the recommendations for MVP, consider offline writes in Phase 2 if users request it

---

## 4. Domain Ownership

**Old implementation:** Share links use `https://popote.io/s/{code}`

**Question:** Do we already own `popote.io`? If not, what domain should we use?

**Options:**
- Buy `popote.io` (if available)
- Use subdomain of existing domain (e.g., `popote.yourcompany.com`)
- Use localhost for MVP, deploy to custom domain later

**My recommendation:** Use localhost for MVP (`http://localhost:5173/s/{code}`). Defer domain purchase until MVP validation.

**Your decision:** Use localhost for MVP or popote.vsantele.dev when deployed to staging/production

---

## 5. PWA vs. Native App Long-Term

**Question:** Is this project committed to PWA, or is there a chance we'll need native mobile app later?

**Context:** If native app is likely, consider Capacitor (PWA wrapper with native plugins). If PWA is final, optimize for web-first.

**My recommendation:** Commit to PWA for now. If native features (push notifications, background sync) become critical, add Capacitor later.

**Your decision:** commit to pwa first. And mobile first for the UI

---

## 6. Database Migrations (Drizzle)

**Question:** Should we version-control migrations, or generate them on-the-fly?

**Trade-offs:**
- **Version-controlled:** Safer (migration history tracked), more files to manage
- **On-the-fly:** Simpler (no migration files), riskier (schema changes can break prod)

**My recommendation:** Version-control migrations (`app/src/lib/db/migrations/` folder). Run `drizzle-kit generate` after schema changes.

**Your decision:** Version-control migrations

---

## 7. Observability (Aspire Dashboard)

**Question:** Should we instrument custom metrics (event creation rate, share code collisions), or rely on Aspire's automatic tracing?

**Context:** Aspire provides traces, logs, metrics out-of-the-box. Custom metrics require manual instrumentation (OpenTelemetry SDK).

**My recommendation:** Start with Aspire's automatic tracing. Add custom metrics only if we need business-level analytics (e.g., "how many events created per day").

**Your decision:** Start with Aspire's automatic tracing

---

## 8. Authentication (Future)

**Question:** Is anonymous device ID sufficient long-term, or will we add OAuth login later?

**Context:** Current design is "no accounts required" (anonymous users with device ID). If users want to access events from multiple devices, we'll need accounts.

**My recommendation:** Keep anonymous-only for MVP. Add OAuth (Google, Apple) in Phase 2 if users request it.

**Your decision:** Keep anonymous-only for MVP. BUt we will need to add accounts in the future if users want to access events from multiple devices or share events with non-device-based users (e.g., family members without smartphones).

---

## 9. Testing Strategy

**Old plan:** Hybrid (unit tests + manual testing on real devices).

**Question:** Should we keep the same testing approach for SvelteKit, or simplify?

**Options:**
- **Unit tests:** Drizzle queries, share code generation, validation logic
- **Integration tests:** Playwright (browser-based E2E tests)
- **Manual tests:** Real device testing (iOS/Android PWA install)

**My recommendation:** Unit tests for business logic, Playwright for happy path flows, manual testing for PWA install UX.

**Your decision:** do the recommendations above. We can add more tests later if we have time, but let's focus on critical paths for now.

---

## 10. Timeline Adjustment

**Old timeline:** 7 weeks for Flutter+PocketBase

**Question:** Do we keep the same 7-week timeline for SvelteKit+Drizzle, or adjust?

**My assessment:** SvelteKit should be faster to iterate (no compile times, hot reload). 7 weeks is achievable, possibly faster.

**Your decision:** Keep 7 weeks

---

## Summary of Recommendations

| Question | My Recommendation |
|----------|-------------------|
| 1. Share code format | Keep 6-char |
| 2. Real-time sync | 5s polling for MVP |
| 3. Offline support | Online-only for MVP |
| 4. Domain | Use localhost for MVP |
| 5. PWA vs. Native | Commit to PWA |
| 6. Database migrations | Version-control migrations |
| 7. Observability | Start with Aspire auto-tracing |
| 8. Authentication | Anonymous-only for MVP |
| 9. Testing strategy | Unit + Playwright + manual |
| 10. Timeline | Keep 7 weeks |

---

**Please review and mark your decisions above.** Once I have your answers, I'll finalize the architecture decisions and propose the initial Drizzle schema.

---

## 11. Data Migration from PocketBase (Kane)

**Context:** You have an existing PocketBase database (`old/backend/pb_data/data.db`) with events, participants, and items.

**Question:** Do we need to migrate this data to the new Postgres database, or can we start fresh?

**Trade-offs:**
- **Migrate:** Preserves existing data (if any production events), requires export/transform/import script
- **Start Fresh:** Simpler, no migration risk, acceptable if no critical data exists

**Recommendation:** Start fresh unless you have production users relying on existing events.

**Your decision:** Start fresh

---

## 12. Real-time Sync Target Latency (Kane)

**Context:** The PRD mentions "< 2 second sync" as a performance requirement. With polling, we can achieve 2-3 second latency easily. With WebSockets, we can achieve < 500ms latency but with added complexity.

**Question:** Is 2-3 second polling acceptable for MVP, or do we need sub-second WebSocket-based sync?

**Context from PRD:** Users want to see items update "quickly" when others add things. Meal planning doesn't require instant sync like collaborative editing.

**Recommendation:** Start with 2-second polling. Upgrade to WebSockets only if user testing shows it's too slow.

**Your decision:** 5 second polling is acceptable for MVP. Do not need to be fully realtime.

---

**Status:** ⏳ Awaiting Victor's response

---

## Lambert's Testing Questions (Added 2026-03-23)

**Context:** I've designed the test strategy for the SvelteKit + Drizzle + Postgres migration. The strategy is documented in `docs/test-plan.md` and `.squad/decisions/inbox/lambert-test-strategy.md`. Below are critical questions that affect testing approach.

---

### 13. Real-time Sync Implementation (HIGH PRIORITY)

**Context:** Real-time sync (< 2 seconds) is a critical success criterion. The testing strategy depends heavily on how we implement this.

**Questions:**

1. **What real-time sync approach are we using?**
   - Option A: Native WebSockets (custom implementation)
   - Option B: Server-Sent Events (SSE) (custom implementation)
   - Option C: Third-party service (Supabase Realtime, Pusher, Ably)
   - Option D: Long polling (Ripley recommended 5s, but PRD says < 2s)

2. **Do we have reconnection logic planned?**
   - What happens if a user loses network connection?
   - How do we handle sync after reconnection?
   - Should I test reconnection scenarios?

3. **How do we handle concurrent edits?**
   - Last-write-wins strategy?
   - Conflict resolution UI?
   - Optimistic updates with rollback?

**Impact on Testing:**
- Different sync approaches require different test strategies
- WebSockets require testing connection lifecycle (open, close, reconnect)
- I need to know this to write integration tests for real-time sync

**Your decision:** don't really need real-time sync for MVP. We can do 5-second polling and test that items appear within 5 seconds after adding. We can add WebSockets in Phase 2 if users want faster sync.

---

### 14. Database Test Setup

**Questions:**

1. **Where is Postgres hosted?**
   - Local development (Docker Compose?)
   - Supabase (managed Postgres + built-in realtime)
   - Railway / Neon / Render
   - Self-hosted

2. **Should I use Testcontainers for integration tests?**
   - Testcontainers = ephemeral Docker Postgres for each test run
   - Alternative: shared test database (faster but requires cleanup)

**Impact on Testing:**
- Need to coordinate test database setup with Kane
- CI/CD needs access to test database
- Integration tests depend on database availability

**Your decision:** you can make intergration tests with aspire.

---

### 15. Test Coverage Target

**Questions:**

1. **What code coverage target should we aim for?**
   - 80% line coverage? (industry standard)
   - 90% critical path coverage?
   - No specific target (pragmatic testing)?

2. **Should I test every edge case or just critical flows?**
   - Exhaustive testing (100+ test cases)?
   - Pragmatic testing (20-30 critical scenarios)?

**Impact on Workload:**
- Higher coverage = more test writing time
- Need to balance thoroughness vs velocity

**Your decision:** Aim for 80% line coverage and focus on critical flows for pragmatic testing.

---

### 16. Browser Support

**Questions:**

1. **Which browsers must we support?**
   - Desktop: Chrome, Firefox, Safari, Edge?
   - Mobile: iOS Safari, Android Chrome?
   - Minimum versions?

2. **What about older iOS Safari versions?**
   - iOS 15+ only?
   - iOS 14 support required?
   - Affects PWA and WebSocket support

**Impact on Testing:**
- Playwright can test Chromium, WebKit, Firefox
- Manual testing required for specific iOS versions
- Need to test share links on actual devices (WhatsApp, SMS)

**Your decision:** use the baseline

---

### 17. Staging Environment for Manual Testing

**Questions:**

1. **Will we have a staging environment for manual testing?**
   - Publicly accessible URL?
   - Or just local development?

2. **When will staging be available?**
   - Week 2? Week 3?
   - Need it for multi-device testing

**Impact on Testing:**
- Manual multi-device tests require staging environment
- Share link testing requires real URLs (not localhost)
- Performance benchmarks more accurate on staging

**Your decision:** Use staging environment for manual testing

---

### 18. Performance Benchmarks (Non-Negotiable?)

**Context:** PRD specifies:
- Event creation: < 30 seconds
- Join + add item: < 20 seconds
- Real-time sync: < 2 seconds

**Questions:**

1. **Are these hard gates or soft goals?**
   - Hard gates: Tests fail if exceeded → block merge
   - Soft goals: Log warnings but don't block

2. **What happens if we exceed them slightly?**
   - Is 3-second sync acceptable?
   - Is 35-second event creation acceptable?

**Impact on Testing:**
- Hard gates mean automated tests must enforce these
- Soft goals mean we measure but don't block on violations

**Your decision:** Treat performance benchmarks as soft goals for MVP. Log warnings if exceeded but do not block merge.

---

**Please review Lambert's questions above and provide answers when you can. The test strategy is ready but needs these clarifications to proceed with implementation.**

— Lambert (Tester)

---

## Ripley's Aspire Setup Questions (Added 2026-03-23)

**Context:** Aspire orchestration is now configured and running. All resources healthy (Postgres, SvelteKit, dashboard). Below are questions specific to the Aspire setup.

---

### 19. Postgres Data Persistence

**Question:** Do you want Postgres data to persist across Aspire restarts (default behavior), or reset on each restart?

**Current State:** Aspire uses Docker volumes for persistence. Data survives restarts.

**Options:**
- ✅ **Keep current behavior** (persistent data, production-like)
- ⚠️ **Reset on restart** (requires adding `.withLifetime("Ephemeral")` to Postgres resource)

**Recommendation:** Keep persistent. Use migrations for schema changes, not data resets.

**Your decision:** keep persistent data across restarts. We want to be able to test with real data and not lose it every time we restart Aspire.

---

### 20. Host Participant Auto-Creation

**Question:** Should we auto-create a participant record for the host when creating an event (like PocketBase)?

**Current PocketBase Logic:** Hook auto-creates participant with `is_host: true`

**Options:**
- ✅ **Auto-create host participant** (matches PocketBase, simpler UX)
- ⚠️ **Manual host participation** (host must explicitly join, more flexible)

**Recommendation:** Auto-create. Host is always a participant (can add items). Matches PocketBase behavior.

**Your decision:** Auto-create host participant.

---

### 21. Aspire Observability: Monitoring Needs

**Question:** Which metrics/traces matter most for MVP?

**Available:**
- HTTP request traces (timing, errors)
- Database query traces (Drizzle)
- Console logs (errors, warnings)
- Metrics (request rate, error rate)

**Options:**
- ✅ **Passive monitoring** (dashboard available, check on errors)
- ⚠️ **Active monitoring** (alerts on errors, Slack integration)

**Recommendation:** Passive for MVP. Aspire dashboard is sufficient. Add alerts in production (v2).

**Your decision:** Passive monitoring for MVP. Use Aspire dashboard to check on errors and metrics.

---

### 22. Database Connection: Manual Access

**Question:** Do you need direct Postgres access (pgAdmin, psql) for debugging?

**Current Setup:** Postgres running in Docker, port 5432, password in Aspire dashboard

**Options:**
- ✅ **Yes, document how to connect** (see `docs/aspire-setup.md`)
- ⚠️ **No, Drizzle ORM only** (safer, prevents manual schema changes)

**Recommendation:** Document manual access for debugging, but discourage schema changes outside migrations.

**Your decision:** yep do the recommendation. Aspire provide connection string and database info in env otherwise.

---

**Status:** ⏳ Awaiting Victor's response

**Next Steps After Answers:**
1. Finalize decisions in `.squad/decisions.md`
2. Implement SvelteKit routes (event creation, share link flow)
3. Run migrations: `cd app && npx drizzle-kit generate && npx drizzle-kit migrate`
4. Test end-to-end flow

— Ripley (Lead)
