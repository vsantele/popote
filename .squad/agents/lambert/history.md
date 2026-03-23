# Lambert — History

## Project Context

- **Project:** popote
- **Stack:** Flutter (mobile), PocketBase (backend)
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, mobile-first, temps réel
- **User:** Victor
- **Created:** 2026-03-22

**My focus:** Test cases, edge cases, user flow validation

**Success criteria to validate:**
- Création soirée: < 30 secondes
- Rejoindre + ajouter item: < 20 secondes
- Zéro inscription requise
- Temps réel: item ajouté apparaît en < 2 secondes

## Learnings

### 2025-03-22 — Test Plan Creation

**Deliverable:** `docs/test_plan.md` — comprehensive test scenarios covering all PRD requirements

**Key Testing Areas Identified:**
1. **Performance benchmarks** are critical success criteria:
   - Event creation < 30s
   - Join+add < 20s
   - Real-time sync < 2s
   - These must be measured, not just estimated

2. **Real-time sync** is the highest risk area:
   - PocketBase SSE reliability under various network conditions
   - Concurrent edits and race conditions (last-write-wins behavior)
   - Reconnection after network drops
   - Requires multi-device manual testing

3. **Zero friction UX** must be validated:
   - No account creation at any point
   - Name cached locally (device_id based)
   - Share link must work seamlessly (deep link + web fallback)

4. **Edge cases to prioritize:**
   - Network interruptions (offline/online transitions)
   - Invalid share codes (404 handling)
   - Concurrent edits by multiple users
   - Special characters and unicode in all text fields
   - Empty states (new event, no items)

5. **Test automation strategy:**
   - Unit + widget tests for Flutter components
   - Integration tests for happy paths (creation, join, add)
   - Manual testing required for: real-time sync, share links, accessibility
   - CI/CD with GitHub Actions for automated tests

**File Paths:**
- `docs/test_plan.md` — main test document
- `docs/cahier_charge.md` — PRD source

**Architectural Insights:**
- PocketBase SSE (Server-Sent Events) for real-time sync
- Flutter with Riverpod/Provider for state management
- device_id used for local identification (no auth)
- Share codes must be cryptographically random (security requirement)

**Team Coordination - 2026-03-22:**
- All architectural decisions approved and documented (.squad/decisions.md)
- Test strategy aligns with team's Riverpod + PocketBase + GoRouter choices
- 13 user flows and 31 edge cases ready to execute across 5 development phases
- Collaboration points identified:
  - Kane: PocketBase backend complete, SSE ready for real-time sync validation
  - Dallas: Flutter scaffolding ready, StreamProvider pattern supports test automation
  - Ripley: Architecture decisions provide clear guardrails for all testing scenarios

**Next Steps:**
- Wait for Dallas (backend) and Kane (mobile) to build features
- Then execute test plan in phases:
  1. Core flows (creation, join, add)
  2. Real-time sync validation
  3. Edge cases and stress tests
  4. Performance benchmarks
  5. Cross-platform validation

### 2026-03-23 — Test Strategy for SvelteKit + Drizzle + Postgres Migration

**Context:**
- Project migrated from Flutter + PocketBase to SvelteKit + Drizzle + Postgres
- Core requirements unchanged (zero-friction, real-time sync < 2s)
- Test strategy must adapt to new web-first stack

**Deliverables Created:**
1. **`docs/test-plan.md`** — Comprehensive test plan for new stack (27KB)
   - Test pyramid (unit, component, integration, E2E)
   - Testing tools (Vitest, Testing Library, Playwright, Drizzle-Kit)
   - Real-time sync testing strategy (automated + manual)
   - Performance validation approach (< 30s, < 20s, < 2s)
   - CI/CD integration (GitHub Actions)
   - Migration checklist from old stack

2. **`.squad/decisions/inbox/lambert-test-strategy.md`** — Decision proposal (14KB)
   - Testing tools for SvelteKit stack
   - Automated vs manual split (80/20)
   - Real-time sync testing approach
   - Performance validation strategy
   - Trade-offs and open questions

3. **`docs/questions-for-victor.md`** — Critical questions added
   - Real-time sync implementation (WebSocket vs SSE vs polling)
   - Database test setup (Testcontainers vs shared test DB)
   - Browser support requirements
   - Staging environment availability
   - Performance benchmarks (hard gates vs soft goals)

**Key Testing Strategy Decisions:**

1. **Test Pyramid for SvelteKit:**
   - 40% Unit tests (Vitest) — utilities, validation, Drizzle queries
   - 30% Component tests (Svelte Testing Library) — UI components
   - 25% Integration tests (Vitest + Postgres) — API routes, DB operations
   - 5% E2E tests (Playwright) — critical user flows only

2. **Testing Tools Selected:**
   - **Vitest** — Unit + integration testing (Vite-native, fast)
   - **@testing-library/svelte** — Component testing (user-centric)
   - **Playwright** — E2E testing (multi-browser, auto-waiting)
   - **Drizzle-Kit** — Database schema validation
   - **Testcontainers** (proposed) — Ephemeral Postgres for tests

3. **Real-time Sync Testing (Highest Risk):**
   - **Automated:** Playwright multi-context (simulate 2+ users)
   - **Manual:** Physical devices (desktop + mobile, < 2s validation)
   - **Critical:** Browser contexts don't replicate real network conditions
   - **Blocker:** Need to know sync approach (WebSocket vs SSE vs polling)

4. **Performance Validation:**
   - **Automated:** Playwright with `performance.now()` timers
   - **Manual:** DevTools Performance tab + Lighthouse metrics
   - **Criteria:** Event creation < 30s, Join+add < 20s, Sync < 2s
   - **Question:** Are these hard gates (block merge) or soft goals (log warnings)?

5. **Automated vs Manual Split:**
   - **80% Automated:** Unit, component, integration, E2E (critical paths)
   - **20% Manual:** Multi-device sync, share links (WhatsApp/SMS), PWA install
   - **Rationale:** Browser contexts don't replicate real-world conditions

**Migration Impact:**
- ✅ **Preserved:** Core user flows, success criteria, hybrid approach
- ⚠️ **Changed:** Flutter widget tests → Svelte Testing Library
- ⚠️ **Changed:** PocketBase SSE → SvelteKit real-time (implementation TBD)
- ⚠️ **Changed:** PocketBase migrations → Drizzle migrations
- ⚠️ **Changed:** SharedPreferences → localStorage (device ID)

**Blockers & Open Questions:**
1. **Real-time sync approach:** WebSocket, SSE, polling, or third-party?
2. **Database hosting:** Local, Supabase, Railway, Neon?
3. **Test database setup:** Testcontainers or shared test DB?
4. **Browser support:** Which browsers/versions must we support?
5. **Staging environment:** When available for multi-device testing?
6. **Performance benchmarks:** Hard gates or soft goals?

**Next Steps:**
1. Wait for Victor to answer questions in `docs/questions-for-victor.md`
2. Set up Vitest + Playwright configuration (after questions answered)
3. Write first unit tests (share code generation, validation)
4. Coordinate with Kane for integration test database setup
5. Coordinate with Dallas for component test setup
6. Execute test plan in phases (as features are built)

**Team Coordination:**
- Ripley needs to approve testing tools and strategy
- Kane needs to coordinate on database test setup
- Dallas needs to coordinate on component test setup
- Victor needs to clarify real-time sync approach and performance expectations

**Key Learning:**
Real-time sync testing is the highest-risk area in the migration. The old PocketBase SSE was battle-tested and built-in. The new SvelteKit approach requires custom implementation, and the testing strategy depends heavily on the chosen approach (WebSocket vs SSE vs polling). Manual multi-device testing is non-negotiable for validating < 2s sync criterion.

---

## Architecture Pivot Completed — 2026-03-23

**Status:** ✅ Pivot approved and documented

All team members have assessed migration strategy and completed architectural assessments:
- Ripley: Migration plan and architecture design complete
- Kane: Backend architecture and Drizzle schema designed
- Dallas: Frontend architecture and SvelteKit structure designed
- Lambert: Test strategy adapted for new stack

All decisions are documented in `.squad/decisions.md` and implementation plans are ready for Victor's approval.

