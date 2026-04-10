# Configuration Technique

**Last Updated:** 2026-04-10

## Frontend

**Framework:** SvelteKit 2.57+

- Svelte 5.55+ (runes: $state, $derived, $effect)
- Vite for build tooling
- TypeScript (strict mode)

**UI Components:**

- shadcn-svelte (bits-ui 2.17.3)
- @lucide/svelte for icons
- Tailwind CSS 4.2+ (@tailwindcss/vite)
- @fontsource-variable/geist for typography

**Forms:**

- Superforms with Zod validation
- Server-side validation in form actions

**PWA:**

- @vite-pwa/sveltekit
- Offline support via service worker
- Installable on mobile/desktop

**Testing:**

- Vitest 4.1+ with @vitest/ui
- @testing-library/svelte 5.3+
- jsdom 29+ for DOM environment

## Backend

**Database:** PostgreSQL 17.6

- Containerized via Aspire orchestration
- Connection string injected by Aspire

**ORM:** Drizzle ORM 0.31+

- drizzle-kit for migrations
- Type-safe queries
- Relational query API

**Runtime:** Node.js 20.19+ / 22.13+ / 24+

- SvelteKit adapter-node for deployment

**Authentication:**

- Device ID based (anonymous, no accounts)
- localStorage + httpOnly cookies
- UUID v4 for device identification

## Infrastructure

**Orchestration:** Aspire

- Manages Postgres container
- Provides observability dashboard (OpenTelemetry)
- Automatic connection string injection
- Health checks and resource management

**Package Manager:** pnpm

- Workspace support
- Faster than npm/yarn

**Development:**

- `npm run dev` - Start Aspire + Postgres + SvelteKit
- `pnpm dev` - SvelteKit only (in app/)
- `pnpm db:studio` - Drizzle Studio GUI

## Key Architectural Decisions

**Real-Time Sync:** 5-second polling (upgradable to WebSockets)
**Share Codes:** 6-8 character alphanumeric (unique, indexed)
**State Management:** Svelte 5 runes + context API
**Form Handling:** Superforms + SvelteKit form actions
**Data Access:** Drizzle relational queries (not manual joins)

## Migration Notes

**Previous Stack (Deprecated):**

- Flutter + PocketBase 0.36.7
- Moved to `old/` directory
- See `docs/migration-plan.md`

**Reason for Change:**
PWA approach (SvelteKit) provides better cross-platform reach, faster iteration, and aligns with "everywhere access" goal.

---

_Ce fichier documente les versions et configurations techniques confirmées._
