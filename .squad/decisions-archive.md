# Squad Decisions Archive

Archived superseded decisions from `decisions.md` (older than 30 days or no longer relevant).

These decisions represent the previous Flutter+PocketBase architecture that was superseded on 2026-03-22 by the SvelteKit+Drizzle+Postgres pivot.

---

## Superseded: State Management: Riverpod [2026-03-22]

**Status:** Approved (Flutter, now superseded)  
**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Why Superseded:** Architecture pivot to SvelteKit uses Svelte 5 runes instead of Riverpod

Use **Riverpod** for state management (not Provider or GetX).

**Rationale:**

- Compile-time safety (code-generated, typos fail at build-time)
- Native async & streaming support (FutureProvider, StreamProvider for SSE)
- No BuildContext required (cleaner separation of concerns)
- Lightweight (Riverpod only, faster compile times)
- Intuitive for small teams (providers as computed values)

**Replacement:** See Decision #5 in main decisions.md (SvelteKit State Management: Svelte 5 Runes)

---

## Superseded: Deep Linking & Share Code Strategy [2026-03-22]

**Status:** Approved (Flutter, now superseded)  
**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Why Superseded:** Flutter implementation replaced by SvelteKit PWA with standard routing

Use **6-8 character alphanumeric share codes** combined with **platform-native deep linking** (App Links for Android, Universal Links for iOS).

**Link Format:** `https://popote.io/s/{shareCode}`  
**Example:** `https://popote.io/s/ABC123`

**Replacement:** Deep linking still used but now via SvelteKit routes (`/s/[code]`) with PWA support

---

## Superseded: Backend Architecture: PocketBase with JS Hooks [2026-03-22]

**Status:** Approved (PocketBase replaced)  
**Implemented by:** Kane (Backend)  
**Date:** 2026-03-22  
**Why Superseded:** PocketBase replaced by Drizzle ORM + PostgreSQL

Use **PocketBase JavaScript hooks** for backend business logic instead of external API layer.

**What Changed:**

- PocketBase SSE → 5-second polling (MVP) or WebSockets (future)
- PocketBase REST → SvelteKit API routes
- SQLite → PostgreSQL

**Replacement:** See Decision #11 in main decisions.md (Backend Architecture: Drizzle + Postgres)

---

## Superseded: Test Strategy: Hybrid Automated + Manual [2026-03-23]

**Status:** Superseded  
**Proposed by:** Lambert (QA Lead)  
**Date:** 2026-03-22  
**Why Superseded:** Architecture pivot changed testing tools and methodology

Hybrid testing approach combining Flutter widget tests + manual validation.

**What Changed:**

- Flutter widget tests → Vitest + @testing-library/svelte
- PocketBase SSE real-time tests → Polling sync tests
- Manual multi-device testing → Browser tab-based testing

**Replacement:** See Decision #16 in main decisions.md (Test Strategy for SvelteKit)

---

## Archive Policy

Decisions are archived when:

1. **Superseded by architecture changes** (marked explicitly)
2. **Older than 30 days** and replaced by newer decisions
3. **Implementation complete and stable** (no longer need decision)

**Storage:**

- Current decisions: `decisions.md` (< 20KB target)
- Archived decisions: `decisions-archive.md` (this file)
- Migration/deprecation guidance: ALWAYS noted in main file with cross-references

**Retrieval:**
If you need context on why something was decided, check:

1. Main `decisions.md` — current active decisions
2. This file — superseded decisions with migration paths
3. Agent history files — implementation details
4. Git history — original decision documents
