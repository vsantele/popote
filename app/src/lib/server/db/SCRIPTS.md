# Scripts to Add to package.json

Add these scripts to `app/package.json` for database operations:

```json
{
  "scripts": {
    // ... existing scripts ...
    
    // Database scripts
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx db/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push",
    "db:introspect": "drizzle-kit introspect"
  }
}
```

## Script Descriptions

### `pnpm db:generate`
Generates migration files from schema changes.
- Compares current `db/schema.ts` with existing migrations
- Creates new SQL migration files in `db/migrations/`
- Run this after modifying schema

### `pnpm db:migrate`
Runs pending migrations against database.
- Applies all unapplied migrations from `db/migrations/`
- Requires Aspire to be running (for connection string)
- Run this to update database schema

### `pnpm db:studio`
Opens Drizzle Studio (web-based database GUI).
- View/edit data in browser
- Alternative to PocketBase admin UI
- Runs on http://localhost:4983

### `pnpm db:push`
Push schema changes directly (without migrations).
- **Use with caution** — destructive in production
- Good for rapid prototyping
- Bypasses migration history

### `pnpm db:introspect`
Generate schema from existing database.
- Useful for reverse-engineering schema
- Creates schema.ts from database tables
- Not needed for this project (schema already defined)

## Recommended Workflow

### 1. Initial Setup
```bash
# Install dependencies
pnpm install

# Start Aspire (starts Postgres)
pnpm aspire start

# Generate initial migration
pnpm db:generate

# Run migration
pnpm db:migrate
```

### 2. Schema Changes
```bash
# 1. Edit db/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Review migration SQL in db/migrations/
# 4. Apply migration
pnpm db:migrate
```

### 3. Debugging
```bash
# Open Drizzle Studio
pnpm db:studio

# Or connect with psql
psql <connection_string_from_aspire>
```

## Dependencies to Install

Add these to `app/package.json`:

```json
{
  "dependencies": {
    "drizzle-orm": "^0.36.4",
    "postgres": "^3.5.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.1",
    "tsx": "^4.19.2"
  }
}
```

Then run:
```bash
cd app
pnpm install
```
