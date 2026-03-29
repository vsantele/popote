# Aspire Setup Guide

**Last Updated:** 2026-03-22  
**Author:** Ripley (Lead)

---

## 📖 Overview

Popote uses **Aspire** to orchestrate the entire application stack:
- **Postgres database** (containerized)
- **SvelteKit app** (Vite development server)
- **Observability dashboard** (OpenTelemetry traces, logs, metrics)

**One command starts everything.** No manual database setup, no separate terminals, no missing environment variables.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│             Aspire AppHost                       │
│             (apphost.ts)                         │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│   Postgres       │   │   SvelteKit App  │
│   (Container)    │   │   (Vite Server)  │
│                  │   │                  │
│   Port: 5432     │   │   Port: 5173     │
│   DB: popotedb   │◄──│   (development)  │
└──────────────────┘   └──────────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
        ┌──────────────────────┐
        │ Aspire Dashboard     │
        │ (Observability)      │
        │                      │
        │ Traces, Logs, Metrics│
        └──────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

✅ Aspire environment is healthy (run `aspire doctor` to verify):
- Docker Desktop running
- HTTPS development certificate trusted
- Node.js 20.19+ or 22.13+ or 24+

### Start the Application

**From the project root (`C:\Users\victo\Projects\popote`):**

```powershell
npm run dev
```

**What this does:**
1. Starts Postgres container (pulls `postgres:latest` if needed)
2. Creates `popotedb` database
3. Starts SvelteKit app with Vite dev server
4. Injects connection string into SvelteKit app (`ConnectionStrings__popotedb`)
5. Opens Aspire dashboard in your browser

**Expected output:**
```
Aspire version: 13.2.0 (Staging)
✔ Starting resource db...
✔ Starting resource app...
✔ Resource db is running on localhost:5432
✔ Resource app is running on localhost:5173
Dashboard: https://popote.dev.localhost:15335
```

---

## 🎛️ Aspire Dashboard

The dashboard opens automatically at: **https://popote.dev.localhost:15335**

### What's Available

1. **Resources Tab**
   - See all running services (Postgres, SvelteKit app)
   - Resource health status
   - Start/stop/restart controls
   - Environment variables (including connection strings)

2. **Console Logs Tab**
   - Real-time logs from all resources
   - Filter by resource (db, app)
   - Search logs (e.g., "error", "migration", "query")

3. **Structured Logs Tab**
   - JSON-formatted logs with metadata
   - Filter by severity (Info, Warning, Error)
   - Trace ID correlation

4. **Traces Tab**
   - Distributed tracing (OpenTelemetry)
   - HTTP requests with timing breakdowns
   - Database query traces (via Drizzle)
   - Error traces with stack traces

5. **Metrics Tab**
   - HTTP request rates
   - Database connection pool stats
   - Memory/CPU usage (future)

### Common Dashboard Tasks

**View SvelteKit logs:**
1. Go to **Console Logs** tab
2. Select **app** resource
3. See Vite server logs, SvelteKit requests, errors

**View Postgres logs:**
1. Go to **Console Logs** tab
2. Select **db** resource
3. See Postgres container startup, queries (if query logging enabled)

**View HTTP traces:**
1. Go to **Traces** tab
2. Click any HTTP request
3. See timing breakdown (SvelteKit → Drizzle → Postgres)

**Check connection string:**
1. Go to **Resources** tab
2. Click **app** resource
3. Scroll to **Environment Variables**
4. See `ConnectionStrings__popotedb` value

---

## 🔧 Configuration

### `apphost.ts` (AppHost Definition)

Location: `C:\Users\victo\Projects\popote\apphost.ts`

```typescript
import { createBuilder } from "./.modules/aspire.js"

const builder = await createBuilder()

// Add Postgres container
const postgres = await builder.addPostgres("db")

// Create database
const db = await postgres.addDatabase("popotedb")

// Add SvelteKit app
const app = await builder
  .addViteApp("app", "./app")   // Vite dev server
  .withPnpm()                    // Use pnpm for dependencies
  .withReference(db)             // Inject connection string
  .waitFor(db)                   // Wait for Postgres before starting

// Run the app
await builder.build().run()
```

**Key concepts:**
- `addPostgres("db")`: Creates Postgres container resource
- `addDatabase("popotedb")`: Creates database inside Postgres
- `withReference(db)`: Injects `ConnectionStrings__popotedb` env var
- `waitFor(db)`: Ensures Postgres is ready before starting SvelteKit

### `aspire.config.json` (Aspire SDK Configuration)

Location: `C:\Users\victo\Projects\popote\aspire.config.json`

```json
{
  "appHost": {
    "path": "apphost.ts",
    "language": "typescript/nodejs"
  },
  "sdk": {
    "version": "13.2.0"
  },
  "channel": "staging",
  "profiles": {
    "https": {
      "applicationUrl": "https://popote.dev.localhost:43292;http://popote.dev.localhost:38814",
      "environmentVariables": {
        "ASPIRE_DASHBOARD_OTLP_ENDPOINT_URL": "https://popote.dev.localhost:15335",
        "ASPIRE_RESOURCE_SERVICE_ENDPOINT_URL": "https://popote.dev.localhost:64026"
      }
    }
  },
  "packages": {
    "Aspire.Hosting.PostgreSQL": "13.2.0",
    "Aspire.Hosting.JavaScript": "13.2.0",
    "Aspire.Hosting.Docker": "13.2.0"
  }
}
```

**Key sections:**
- `sdk.version`: Aspire version (13.2.0)
- `channel`: "staging" (latest stable builds)
- `packages`: NuGet packages for Postgres, JavaScript, Docker support

---

## 🗄️ Database Connection

### Connection String Injection

Aspire automatically injects the connection string into the SvelteKit app:

**Environment variable:**
```
ConnectionStrings__popotedb=Host=localhost;Port=5432;Username=postgres;Password=...;Database=popotedb
```

**Usage in SvelteKit (already configured):**

```typescript
// app/db/index.ts
import { env } from '$env/dynamic/private';

const connectionString = 
  env.ConnectionStrings__popotedb || 
  env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Database connection string not found.');
}

client = postgres(connectionString);
db = drizzle(client, { schema });
```

**No manual configuration needed.** Connection string is injected by Aspire when you run `npm run dev`.

### Direct Postgres Access (Manual)

If you need to access Postgres directly (e.g., pgAdmin, psql):

**Host:** `localhost`  
**Port:** `5432`  
**Username:** `postgres`  
**Password:** *(random, see Aspire dashboard)*  
**Database:** `popotedb`

**Get password from dashboard:**
1. Go to **Resources** tab
2. Click **db** resource
3. Scroll to **Environment Variables**
4. Find `POSTGRES_PASSWORD`

**Connect with psql:**
```powershell
psql -h localhost -p 5432 -U postgres -d popotedb
# Enter password from dashboard
```

---

## 📊 Database Migrations

### Schema Location

**Schema:** `app/db/schema.ts` (Drizzle ORM)

**Tables:**
- `events`: Event details (name, date, location, share_code)
- `participants`: Participants per event (device_id, name, is_host)
- `items`: Items participants bring (name, category, quantity)

### Running Migrations

**Generate migration from schema changes:**

```powershell
cd app
npx drizzle-kit generate
```

This creates a new migration file in `app/db/migrations/`.

**Apply migrations to Postgres:**

```powershell
cd app
npx drizzle-kit migrate
```

This runs all pending migrations against the Aspire-managed Postgres.

**Drizzle configuration:**

File: `app/drizzle.config.ts`

```typescript
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Reads from Aspire-injected env var
    url: process.env.ConnectionStrings__popotedb || '',
  },
});
```

**Migration workflow:**
1. Edit schema in `app/db/schema.ts`
2. Run `npx drizzle-kit generate` (creates SQL migration)
3. Review generated migration in `app/db/migrations/`
4. Run `npx drizzle-kit migrate` (applies to Postgres)
5. Restart SvelteKit app (Aspire restarts automatically)

---

## 🛠️ Common Tasks

### Start the Application

```powershell
npm run dev
```

Opens Aspire dashboard and starts all resources.

### Stop the Application

**Option 1: Ctrl+C in terminal**

Stops Aspire AppHost, shuts down all resources gracefully.

**Option 2: Aspire Dashboard**

1. Go to **Resources** tab
2. Click **Stop** on each resource
3. Close terminal

### Restart SvelteKit Only

**From Aspire Dashboard:**
1. Go to **Resources** tab
2. Click **Restart** on **app** resource

**From terminal:**
```powershell
# Aspire automatically restarts on file changes (Vite HMR)
# No manual restart needed during development
```

### Restart Postgres

**From Aspire Dashboard:**
1. Go to **Resources** tab
2. Click **Restart** on **db** resource

**Note:** Restarting Postgres will also restart the SvelteKit app (due to `waitFor(db)`).

### View Logs

**Console logs (all resources):**
```powershell
# From Aspire dashboard: Console Logs tab
```

**Structured logs (JSON):**
```powershell
# From Aspire dashboard: Structured Logs tab
```

**Filter by resource:**
- Select **app** for SvelteKit logs
- Select **db** for Postgres logs

### View Traces

**HTTP request traces:**
1. Go to **Traces** tab
2. See all HTTP requests to SvelteKit
3. Click a trace to see timing breakdown

**Database query traces:**
- Traces include Drizzle queries to Postgres
- See query timing, parameters, results

### Check Resource Health

**From Aspire Dashboard:**
1. Go to **Resources** tab
2. See health status (green = healthy, red = unhealthy)

**From terminal:**
```powershell
aspire list-resources
```

---

## 🐛 Troubleshooting

### Postgres Not Starting

**Symptom:** Aspire dashboard shows **db** resource in "Starting..." state indefinitely.

**Possible causes:**
- Docker Desktop not running
- Port 5432 already in use

**Fix:**
1. Start Docker Desktop
2. Check if port 5432 is in use:
   ```powershell
   netstat -ano | findstr :5432
   ```
3. If port is in use, stop the conflicting process or change Postgres port in `apphost.ts`

### SvelteKit App Not Starting

**Symptom:** Aspire dashboard shows **app** resource in "Starting..." state indefinitely.

**Possible causes:**
- Dependencies not installed
- Postgres not ready

**Fix:**
1. Install dependencies:
   ```powershell
   cd app
   pnpm install
   ```
2. Check Postgres is running (see above)
3. Check console logs in Aspire dashboard

### Connection String Not Found

**Symptom:** SvelteKit app crashes with error:
```
Error: Database connection string not found. Check Aspire configuration.
```

**Possible causes:**
- Aspire not injecting connection string
- App started outside Aspire

**Fix:**
- Always start with `npm run dev` (not `cd app && pnpm run dev`)
- Check Aspire dashboard **app** resource → **Environment Variables**
- Verify `ConnectionStrings__popotedb` exists

### Dashboard Not Opening

**Symptom:** Aspire starts but dashboard doesn't open in browser.

**Possible causes:**
- HTTPS dev certificate not trusted
- Dashboard port conflict

**Fix:**
1. Verify dev certificate:
   ```powershell
   aspire doctor
   ```
2. Manually open dashboard URL from terminal output
3. If HTTPS error, trust certificate:
   ```powershell
   dotnet dev-certs https --trust
   ```

### Postgres Data Persistence

**Question:** Does Postgres data persist between restarts?

**Answer:** Yes, by default Aspire uses a Docker volume for Postgres data. Data persists across restarts.

**To reset database:**
1. Stop Aspire (`Ctrl+C`)
2. Remove Docker volume:
   ```powershell
   docker volume ls
   docker volume rm <volume-name>
   ```
3. Restart Aspire (`npm run dev`)

---

## 🔍 Advanced Configuration

### Change Postgres Port

**Edit `apphost.ts`:**

```typescript
const postgres = await builder
  .addPostgres("db")
  .withHostPort(5433); // Change from default 5432

const db = await postgres.addDatabase("popotedb");
```

**Why:** Avoid port conflicts with local Postgres installation.

### Add Health Checks

**Edit `apphost.ts`:**

```typescript
const app = await builder
  .addViteApp("app", "./app")
  .withPnpm()
  .withReference(db)
  .waitFor(db)
  .withHealthCheck("http://localhost:5173/health"); // Add health endpoint

// Implement /health endpoint in SvelteKit (e.g., +server.ts)
```

**Why:** Monitor app health in Aspire dashboard (green/yellow/red status).

### Add Environment Variables

**Edit `apphost.ts`:**

```typescript
const app = await builder
  .addViteApp("app", "./app")
  .withPnpm()
  .withReference(db)
  .withEnvironment("PUBLIC_SHARE_URL_BASE", "https://popote.io/s")
  .withEnvironment("POLL_INTERVAL_MS", "5000");
```

**Access in SvelteKit:**

```typescript
// Public vars (client-side)
import { env } from '$env/dynamic/public';
const shareUrlBase = env.PUBLIC_SHARE_URL_BASE;

// Private vars (server-side only)
import { env } from '$env/dynamic/private';
const pollInterval = env.POLL_INTERVAL_MS;
```

### Enable Postgres Query Logging

**Edit `apphost.ts`:**

```typescript
const postgres = await builder
  .addPostgres("db")
  .withEnvironment("POSTGRES_LOG_STATEMENT", "all"); // Log all queries

const db = await postgres.addDatabase("popotedb");
```

**View logs:**
- Go to **Console Logs** tab → **db** resource
- See all SQL queries executed by Drizzle

**Warning:** Very verbose, use only for debugging.

---

## 📚 Additional Resources

**Aspire Documentation:**
- Official: https://aspire.dev
- Postgres integration: https://aspire.dev/docs/postgres
- JavaScript/Node.js apps: https://aspire.dev/docs/javascript

**Drizzle ORM Documentation:**
- https://orm.drizzle.team/docs/overview
- Postgres guide: https://orm.drizzle.team/docs/get-started-postgresql

**Project Documentation:**
- Database schema: `app/db/schema.ts`
- Migration plan: `docs/migration-plan.md`
- Questions for Victor: `docs/questions-for-victor.md`

---

## 🎯 Next Steps

1. **Run migrations:**
   ```powershell
   cd app
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

2. **Implement SvelteKit routes:**
   - Event creation: `app/src/routes/+page.svelte`
   - Event detail: `app/src/routes/s/[code]/+page.svelte`
   - API routes: `app/src/routes/api/events/+server.ts`

3. **Test real-time sync:**
   - Open event in two browser windows
   - Add item in one, see it appear in the other (5s polling)

4. **Deploy to production:**
   - See `docs/deployment.md` (to be created)
   - Aspire supports Azure Container Apps, Kubernetes, Docker Compose

---

**Author:** Ripley (Lead)  
**Last Updated:** 2026-03-22  
**Questions:** Add to `docs/questions-for-victor.md`
