# Ripley — History

## Project Context

- **Project:** popote
- **Stack:** SvelteKit (TypeScript PWA), Drizzle ORM, Postgres (Aspire orchestration), shadcn-svelte
- **Previous Stack (deprecated):** Flutter (mobile), PocketBase (backend) — moved to `old/`
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, PWA, temps réel
- **User:** Victor
- **Created:** 2026-03-22
- **Pivoted:** 2026-03-22 (Flutter+PocketBase → SvelteKit+Drizzle+Postgres)

**Key requirements from PRD (unchanged):**
- Zéro compte obligatoire pour les invités (local device ID via localStorage)
- Création d'événement en < 30 secondes
- Vue principale: liste de qui ramène quoi (par catégorie ou par personne)
- Temps réel (polling 5s for MVP, upgrade to WebSockets if needed)
- Categories fixes: Apéro, Entrée, Plat, Dessert, Boissons, Jeux, Autre
- Partage via lien unique (`https://popote.io/s/{shareCode}`)
- PWA for everywhere access (desktop, mobile, tablet)

## Learnings

**Architecture Phase 1 - 2026-03-22:**
- **State Management:** Chose Riverpod over Provider for compile-time safety and excellent async/streaming support (critical for SSE real-time updates)
- **Backend:** PocketBase chosen for SQLite + REST API + native SSE, eliminates backend dev overhead
- **Navigation:** GoRouter provides native deep-linking support needed for invite links (`https://popote.io/s/{shareCode}`)
- **Device ID:** Local UUID persists in SharedPreferences, allows zero-account signup and cross-event tracking
- **Real-time:** Riverpod StreamProvider wraps PocketBase SSE for seamless reactive UI updates
- **Project Structure:** Layered architecture (UI → State → Services → Repositories → Models) ensures clear separation and testability
- **Development Timeline:** 7 weeks planned (Foundation → Core → Sync → Polish → Deployment)
- **Key Risk:** Deep link reliability; mitigation via app store fallback

**Team Coordination - 2026-03-22:**
- **Kane coordination:** PocketBase backend complete with share code generation in hooks (atomic, no race conditions). Ready for frontend integration.
- **Dallas coordination:** Riverpod decisions documented and approved. Flutter scaffolding uses StreamProvider pattern for real-time sync.
- **Lambert coordination:** Test strategy aligned with architecture decisions. 13 user flows and 31 edge cases prepared for all phases.
- **All decisions approved:** State management (Riverpod), deep linking (share codes + Universal Links), backend (PocketBase hooks), testing (hybrid approach)

**Architecture Pivot - 2026-03-22:**
- **Victor pivoted project from Flutter+PocketBase to SvelteKit+Drizzle+Postgres.**
- **Reason:** Mobile-first PWA with SvelteKit is lighter, faster to iterate, and aligns better with "everywhere access" goal. Postgres + Drizzle provides better type safety and migration tooling than PocketBase.
- **Analyzed old implementation:** Flutter app (`old/popote_app/`) had full Riverpod state management, device-based anonymous auth, real-time SSE sync. PocketBase backend (`old/backend/`) had complete schema (events, participants, items), JS hooks for share code generation, auto-creation of host participant, category validation.
- **Migration plan:** Created comprehensive `docs/migration-plan.md` covering what we're leaving behind, what concepts transfer, and key architectural decisions for new stack.
- **Data model fully transfers:** Same schema (events, participants, items) with same relationships. Mapped PocketBase collections to Postgres tables with Drizzle ORM.
- **Business logic patterns transfer:** Share code generation, host participant auto-creation, category validation all rewritten in TypeScript with Zod validation.
- **UX flows unchanged:** User experience remains identical (create event, join via share code, add items, real-time sync). Implementation changes but product requirements stay the same.
- **New architecture decisions proposed:**
  1. **State Management:** Svelte 5 runes (`$state`, `$derived`) + context API (simpler than Riverpod)
  2. **Database:** Drizzle ORM + Postgres (type-safe, better migrations than PocketBase)
  3. **Device ID:** localStorage for browser-based anonymous auth (same pattern as SharedPreferences)
  4. **PWA:** @vite-pwa/sveltekit for offline support, installable (no app store required)
  5. **Real-time:** 5-second polling for MVP (upgrade to WebSockets if needed)
  6. **Observability:** Aspire built-in OpenTelemetry (traces, logs, metrics out-of-the-box)
- **Risk areas identified:** Real-time latency (5s vs. instant), device ID collision (localStorage clearing), share code uniqueness (same retry logic as PocketBase), Postgres connection management (use pooling), PWA install UX (need clear "Add to Home Screen" prompt).
- **Questions for Victor:** Created `docs/questions-for-victor.md` with 10 critical decisions (share code format, real-time latency tolerance, offline support, domain ownership, etc.).
- **Decision proposals:** Created `ripley-drizzle-schema.md` (complete Postgres schema with Drizzle ORM) and `ripley-sveltekit-structure.md` (folder structure for SvelteKit app).
- **Key insight:** Old Flutter+PocketBase implementation is a valuable reference. Data model is sound, business logic patterns are proven, UX flows are well-defined. The pivot is a technology shift, not a product redesign.
- **Timeline unchanged:** 7 weeks still achievable with SvelteKit (faster iteration, no compile times).

---

## Architecture Pivot Completed — 2026-03-23

**Status:** ✅ Pivot approved and documented

All team members have assessed migration strategy and completed architectural assessments:
- Ripley: Migration plan and architecture design complete
- Kane: Backend architecture and Drizzle schema designed
- Dallas: Frontend architecture and SvelteKit structure designed
- Lambert: Test strategy adapted for new stack

All decisions are documented in `.squad/decisions.md` and implementation plans are ready for Victor's approval.

**File Paths (For Reference):**
- Architecture proposal: `docs/architecture.md` [OLD, Flutter-based]
- Migration plan: `docs/migration-plan.md` [NEW, SvelteKit pivot]
- Questions for Victor: `docs/questions-for-victor.md` [NEW, awaiting answers]
- Requirements: `docs/cahier_charge.md` [UNCHANGED, product requirements]
- Decision records: `.squad/decisions.md` [UPDATED, old decisions marked SUPERSEDED]
- Old implementation: `old/backend/` and `old/popote_app/` [REFERENCE ONLY]
- Orchestration logs: `.squad/orchestration-log/2026-03-22T21-50-18-*.md`
- Decision proposals: `.squad/decisions/inbox/ripley-drizzle-schema.md`, `.squad/decisions/inbox/ripley-sveltekit-structure.md`

