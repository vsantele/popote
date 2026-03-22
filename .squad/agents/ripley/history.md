# Ripley — History

## Project Context

- **Project:** popote
- **Stack:** Flutter (mobile), PocketBase (backend)
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, mobile-first, temps réel
- **User:** Victor
- **Created:** 2026-03-22

**Key requirements from PRD:**
- Zéro compte obligatoire pour les invités (local device ID)
- Création d'événement en < 30 secondes
- Vue principale: liste de qui ramène quoi (par catégorie ou par personne)
- Temps réel via PocketBase SSE
- Categories fixes: Apéro, Entrée, Plat, Dessert, Boissons, Jeux, Autre
- Partage via lien unique avec deep linking

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

**File Paths (For Reference):**
- Architecture proposal: `docs/architecture.md`
- Requirements: `docs/cahier_charge.md`
- Decision records: `.squad/decisions.md`
- Orchestration logs: `.squad/orchestration-log/2026-03-22T21-50-18-*.md`

