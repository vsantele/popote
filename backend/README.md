# Popote Backend — PocketBase

Backend for the Popote collaborative meal planning app.

## Stack

- **PocketBase 0.22+** — Self-hosted backend with SQLite
- **Realtime via SSE** — Live updates for all participants
- **Anonymous auth** — No accounts required, device-based identification

## Quick Start

### 1. Install PocketBase

Download PocketBase for your platform:
- **Windows:** [pocketbase_windows_amd64.zip](https://github.com/pocketbase/pocketbase/releases)
- **macOS:** [pocketbase_darwin_amd64.zip](https://github.com/pocketbase/pocketbase/releases)
- **Linux:** [pocketbase_linux_amd64.zip](https://github.com/pocketbase/pocketbase/releases)

Extract the executable to this `backend/` directory.

### 2. Run PocketBase

```bash
# Windows
.\pocketbase.exe serve

# macOS/Linux
./pocketbase serve
```

PocketBase will:
- Start on `http://127.0.0.1:8090`
- Create `pb_data/` directory for SQLite database
- Admin UI available at `http://127.0.0.1:8090/_/`

### 3. Apply Migrations

On first run, PocketBase will automatically apply migrations from `pb_migrations/`.

### 4. Admin Setup

1. Navigate to `http://127.0.0.1:8090/_/`
2. Create admin account (first time only)
3. Collections will be auto-created from migrations

## Collections

### `events`
Stores meal events/parties.

**Fields:**
- `name` (text) — Event name
- `date` (datetime) — Event date and time
- `location` (text, optional) — Event location/address
- `description` (text, optional) — Additional notes
- `host_name` (text) — Host's first name
- `host_device_id` (text) — Host device identifier
- `share_code` (text, unique) — Short code for sharing (auto-generated)

### `participants`
Stores event participants.

**Fields:**
- `event` (relation → events) — Link to event
- `name` (text) — Participant's first name
- `device_id` (text) — Device identifier for local data
- `is_host` (bool) — Whether this participant is the host

### `items`
Stores items that participants bring.

**Fields:**
- `event` (relation → events) — Link to event
- `participant` (relation → participants) — Who is bringing it
- `name` (text) — Item name (e.g., "Tiramisu maison")
- `category` (select) — One of: apero, entree, plat, dessert, boissons, jeux, autre
- `quantity` (text, optional) — Quantity/precision (e.g., "pour 6 personnes")

## API Endpoints

PocketBase auto-generates REST API:

- `GET /api/collections/events/records` — List events
- `POST /api/collections/events/records` — Create event
- `GET /api/collections/events/records/:id` — Get event
- `PATCH /api/collections/events/records/:id` — Update event
- `DELETE /api/collections/events/records/:id` — Delete event

Same pattern for `participants` and `items`.

### Realtime

Subscribe to realtime updates via SSE:

```
GET /api/realtime
```

Events are pushed when records are created/updated/deleted.

## Hooks

### `share_code` Generation

Located in `pb_hooks/events.pb.js`:
- Generates unique 6-character share codes for new events
- Ensures uniqueness across all events
- Format: uppercase alphanumeric (e.g., "ABC123")

## Development

### Run with Auto-restart

```bash
# Using --dev flag for auto-reload on code changes
./pocketbase serve --dev
```

### View Logs

```bash
# Logs are written to pb_data/logs/
tail -f pb_data/logs/latest.log
```

### Backup Database

```bash
# SQLite database is in pb_data/data.db
cp pb_data/data.db pb_data/data.db.backup
```

## Production Notes

- Use environment variables for configuration
- Enable HTTPS with reverse proxy (nginx, Caddy)
- Consider PocketHost.io for managed hosting
- Regular database backups recommended
- Set proper CORS origins in PocketBase settings
- **Configure API access rules** — See API_RULES.md for security configuration

## Resources

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [PocketBase Go API](https://pkg.go.dev/github.com/pocketbase/pocketbase)
- [JavaScript Hooks Guide](https://pocketbase.io/docs/js-overview/)
- **API_RULES.md** — Production access rules and device-based authentication
