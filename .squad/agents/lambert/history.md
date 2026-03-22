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

