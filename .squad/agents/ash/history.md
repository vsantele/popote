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
