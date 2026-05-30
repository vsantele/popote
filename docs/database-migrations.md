# Database Migration Strategy

## Overview

Popote uses **Drizzle ORM** with **Cloudflare D1** (SQLite), managed through the
**void platform**. Migrations are applied with the `void db` CLI — there is no
runtime migration hook and no orchestration container.

## How It Works

The database is a Cloudflare D1 binding (`DB`, see `wrangler.jsonc`). At runtime
the application accesses it through `void/db`, which injects the Drizzle schema
and exposes a query builder (`db.select`, `db.insert`, ...). Migrations are
generated from the schema and applied explicitly via the void CLI.

## Files

- **`src/lib/server/db/schema.ts`**: Re-exports the Drizzle schema (`@schema`)
- **`src/lib/server/db/index.ts`**: Data-access functions built on `void/db`
- **`src/lib/server/db/utils.ts`**: Helpers (e.g. share-code generation)

## Migration Workflow

```bash
# 1. Modify the schema
#    src/lib/server/db/schema.ts (and the underlying @schema source)

# 2. Apply migrations to the (local/remote) D1 database
pnpm db:migrate        # void db migrate

# Or push the schema directly without generating migration files
pnpm db:push           # void db push

# 3. Inspect data with the studio UI
pnpm db:studio         # void db studio
```

The npm scripts map directly to the void CLI:

| Script           | Command           | Purpose                                |
| ---------------- | ----------------- | -------------------------------------- |
| `pnpm db:migrate`| `void db migrate` | Apply pending migrations to D1         |
| `pnpm db:push`   | `void db push`    | Push the current schema to D1          |
| `pnpm db:studio` | `void db studio`  | Open the Drizzle Studio GUI            |

## Deployment

The worker is deployed to Cloudflare via void (`vp build`). The D1 database is
bound through `wrangler.jsonc` (`d1_databases` → binding `DB`). Run
`pnpm db:migrate` against the target environment to apply migrations before or
during deployment — no init container or separate migration service is needed.

## Rollback Strategy

Drizzle migrations are **forward-only**. To undo a change:

1. Modify the schema to the desired state.
2. Generate/apply a new migration with `pnpm db:migrate`.

## Troubleshooting

### `db.query.*` is undefined in local dev

void only injects the schema into `db` via its Vite virtual module, which is not
applied to server modules in local dev. Use the core query builder
(`db.select`, `db.insert`, ...) instead of the relational API (`db.query.*`);
this works in both dev and production. See `src/lib/server/db/index.ts`.

### Migrations not applying

Confirm the D1 binding in `wrangler.jsonc` is correct and re-run
`pnpm db:migrate`. Use `pnpm db:studio` to inspect the current state of the
database.
