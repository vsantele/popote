# Popote 🍴

**Application d'organisation de repas/soirées collaboratifs**  
_La popote entre potes, bien organisée._

---

## 📖 Description

Popote permet à un hôte d'organiser facilement un repas ou une soirée type "auberge espagnole" où chaque invité ramène quelque chose. L'app garantit **zéro friction** : pas de compte requis, création en 30 secondes, et mise à jour en temps réel.

**Principes clés :**

- 🚀 Zéro compte obligatoire — rejoint via un lien
- ⚡ Création en 30 secondes
- 📱 PWA — fonctionne partout (mobile, desktop, tablet)
- 🔄 Temps réel — mise à jour automatique (5s polling, upgradable to WebSockets)

---

## 🏗️ Architecture

### Stack (Current)

**Frontend:**

- **SvelteKit** (TypeScript PWA)
- Svelte 5 runes for reactive state
- shadcn-svelte UI components
- PWA support (offline, installable)

**Backend:**

- **Postgres** (containerized via Aspire)
- **Drizzle ORM** (type-safe database access)
- Device-based authentication (anonymous, no accounts)

**Orchestration:**

- **Aspire** (manages Postgres + SvelteKit + observability)
- One command starts everything
- Built-in OpenTelemetry (traces, logs, metrics)

📂 **Location:** `app/` (SvelteKit), `apphost.ts` (Aspire)

---

## 🚀 Quick Start

### Prerequisites

✅ **Required:**

- Node.js 20.19+ or 22.13+ or 24+
- pnpm (`npm install -g pnpm`)
- Docker Desktop (running)
- Aspire CLI (`npm install -g aspire`)

✅ **Verify environment health:**

```powershell
aspire doctor
```

Should show:

- ✅ HTTPS development certificate is trusted
- ✅ Docker Desktop detected and running

### Start the Application

**From project root:**

```powershell
npm run dev
```

**What this does:**

- Starts Postgres container (port 5432)
- Creates `popotedb` database
- Starts SvelteKit app (port 5173)
- Opens Aspire dashboard (observability)

**Access the app:**

- **SvelteKit:** http://localhost:5173
- **Aspire Dashboard:** https://popote.dev.localhost:15335

### Stop the Application

Press `Ctrl+C` in the terminal. Aspire shuts down all resources gracefully.

📚 See `docs/aspire-setup.md` for detailed configuration and troubleshooting

---

## 📁 Project Structure

```
popote/
├── app/                        # SvelteKit PWA
│   ├── src/                   # SvelteKit routes & components
│   │   ├── routes/           # Pages & API endpoints
│   │   └── lib/              # Shared code
│   ├── db/                    # Database layer
│   │   ├── schema.ts         # Drizzle schema (tables)
│   │   ├── index.ts          # DB client (connection)
│   │   └── migrations/       # SQL migrations
│   ├── drizzle.config.ts     # Drizzle configuration
│   └── package.json          # SvelteKit dependencies
├── apphost.ts                 # Aspire orchestration
├── aspire.config.json         # Aspire SDK configuration
├── package.json               # Root package (Aspire)
├── docs/                      # Project documentation
│   ├── aspire-setup.md       # Aspire guide (THIS IS KEY)
│   ├── migration-plan.md     # Stack pivot details
│   ├── questions-for-victor.md # Open questions
│   └── cahier_charge.md      # Product requirements (French)
└── .squad/                    # Team coordination
    ├── agents/               # Agent history
    └── decisions/            # Architecture decisions
```

---

## 📊 Data Model

### Tables (Postgres + Drizzle)

**Schema location:** `app/db/schema.ts`

1. **events** — Meal events/parties
   - `id` (serial), `name`, `date`, `location`, `description`
   - `host_name`, `host_device_id` (anonymous auth)
   - `share_code` (unique, 6-8 chars, for joining)
   - `created_at`, `updated_at`

2. **participants** — Event participants
   - `id` (serial), `event_id` (FK → events)
   - `name`, `device_id` (anonymous auth), `is_host`
   - `created_at`, `updated_at`

3. **items** — Items participants bring
   - `id` (serial), `event_id` (FK → events), `participant_id` (FK → participants)
   - `name`, `category`, `quantity`
   - `created_at`, `updated_at`

### Categories

🥂 Apéro | 🥗 Entrée | 🍖 Plat | 🍰 Dessert | 🍷 Boissons | 🎲 Jeux | 📦 Autre

### Migrations

**Generate migration from schema changes:**

```powershell
cd app
npx drizzle-kit generate
```

**Apply migrations to Postgres:**

```powershell
cd app
npx drizzle-kit migrate
```

See `docs/aspire-setup.md` for full migration workflow.

---

## 👥 Team

- **Ripley** — Lead (architect, orchestration, decisions)

- **Victor** — Product Owner (requirements, priorities)

See `.squad/` for team coordination and decisions.

---

## 📚 Documentation

**Essential:**

- **🚀 Aspire Setup Guide:** `docs/aspire-setup.md` (START HERE)
- **Product Requirements:** `docs/cahier_charge.md` (French)
- **Migration Plan:** `docs/migration-plan.md` (Flutter → SvelteKit pivot)
- **Open Questions:** `docs/questions-for-victor.md` (awaiting answers)

**Old Stack (Deprecated):**

- Backend Guide: `old/backend/README.md`
- API Reference: `old/backend/API_EXAMPLES.md`
- Data Schema: `old/backend/schema.json`

---

## 🎯 MVP Features (v1)

**Planned (not yet implemented):**

- [ ] Create event with minimal info
- [ ] Share event via link (unique code)
- [ ] Join event anonymously (device ID)
- [ ] Add items with categories
- [ ] View items by category or person
- [ ] Realtime sync (5s polling)
- [ ] Edit/delete own items
- [ ] PWA install prompt
- [ ] Offline support

---

## 🚧 Out of Scope (v1)

- User accounts / login
- Chat or comments
- Budget / reimbursements
- Calendar integration
- Push notifications

---

## 📈 Progress

### Infrastructure ✅

- [x] Aspire orchestration setup
- [x] Postgres container configuration
- [x] Drizzle ORM schema
- [x] SvelteKit scaffolding
- [x] shadcn-svelte UI components
- [x] Observability dashboard
- [x] Documentation

### Backend 🚧

- [x] Database schema (Drizzle)
- [x] Connection string injection (Aspire)
- [ ] Migrations (generate + apply)
- [ ] API routes (event CRUD)
- [ ] Share code generation logic
- [ ] Device ID middleware
- [ ] Real-time polling endpoints

### Frontend 🚧

- [ ] Event creation page
- [ ] Event detail page (share link view)
- [ ] Item list (by category/person)
- [ ] Add item modal
- [ ] Real-time sync (polling)
- [ ] Device ID management (localStorage)
- [ ] PWA manifest + service worker
- [ ] Offline support

---

## 🔗 Resources

**Current Stack:**

- [Aspire Docs](https://aspire.dev)
- [SvelteKit Docs](https://svelte.dev/docs/kit)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [shadcn-svelte](https://www.shadcn-svelte.com/)

---

## 📄 License

Private project — all rights reserved.

---

**Status:** Infrastructure complete, SvelteKit implementation in progress.  
**Next:** Implement event creation, share link flow, and real-time sync.
