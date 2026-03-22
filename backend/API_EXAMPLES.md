# API Examples

Quick reference for common API operations with the Popote backend.

**Base URL:** `http://127.0.0.1:8090/api`

## Events

### Create Event

```bash
curl -X POST http://127.0.0.1:8090/api/collections/events/records \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Barbecue chez Nico",
    "date": "2024-06-15 18:00:00",
    "location": "12 rue de la Paix, Paris",
    "description": "Ramenez vos spécialités!",
    "host_name": "Nicolas",
    "host_device_id": "device-123-abc"
  }'
```

Response includes auto-generated `share_code`:
```json
{
  "id": "abc123xyz",
  "name": "Barbecue chez Nico",
  "date": "2024-06-15 18:00:00",
  "share_code": "A3B7X2",
  ...
}
```

### Get Event by Share Code

```bash
curl "http://127.0.0.1:8090/api/collections/events/records?filter=(share_code='A3B7X2')"
```

### List All Events

```bash
curl "http://127.0.0.1:8090/api/collections/events/records"
```

### Get Event with Relations (expand)

```bash
curl "http://127.0.0.1:8090/api/collections/events/records/abc123xyz?expand=participants,items"
```

## Participants

### Create Participant

```bash
curl -X POST http://127.0.0.1:8090/api/collections/participants/records \
  -H "Content-Type: application/json" \
  -d '{
    "event": "abc123xyz",
    "name": "Marie",
    "device_id": "device-456-def",
    "is_host": false
  }'
```

### List Participants for Event

```bash
curl "http://127.0.0.1:8090/api/collections/participants/records?filter=(event='abc123xyz')"
```

## Items

### Create Item

```bash
curl -X POST http://127.0.0.1:8090/api/collections/items/records \
  -H "Content-Type: application/json" \
  -d '{
    "event": "abc123xyz",
    "participant": "participant123",
    "name": "Tiramisu maison",
    "category": "dessert",
    "quantity": "pour 8 personnes"
  }'
```

### List Items for Event

```bash
curl "http://127.0.0.1:8090/api/collections/items/records?filter=(event='abc123xyz')"
```

### List Items by Category

```bash
curl "http://127.0.0.1:8090/api/collections/items/records?filter=(event='abc123xyz'%26%26category='dessert')"
```

### Update Item

```bash
curl -X PATCH http://127.0.0.1:8090/api/collections/items/records/item123 \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": "pour 10 personnes"
  }'
```

### Delete Item

```bash
curl -X DELETE http://127.0.0.1:8090/api/collections/items/records/item123
```

## Realtime

### Subscribe to Event Updates (SSE)

```javascript
// JavaScript example
const eventSource = new EventSource('http://127.0.0.1:8090/api/realtime');

eventSource.addEventListener('PB_CONNECT', (e) => {
  console.log('Connected to realtime');
});

// Subscribe to specific event
eventSource.addEventListener('items', (e) => {
  const data = JSON.parse(e.data);
  console.log('Item update:', data.action, data.record);
  // data.action: "create", "update", "delete"
});

eventSource.addEventListener('participants', (e) => {
  const data = JSON.parse(e.data);
  console.log('Participant update:', data.action, data.record);
});
```

## Query Parameters

### Filtering

```bash
# Single condition
?filter=(category='plat')

# Multiple conditions (AND)
?filter=(event='abc123'%26%26category='dessert')

# OR condition
?filter=(category='plat'||category='entree')
```

### Sorting

```bash
# Sort by date ascending
?sort=+date

# Sort by date descending
?sort=-date

# Multiple sort fields
?sort=+category,-created
```

### Pagination

```bash
# Page 1, 20 items per page
?page=1&perPage=20

# Page 2
?page=2&perPage=20
```

### Expand Relations

```bash
# Expand single relation
?expand=participant

# Expand multiple relations
?expand=participant,event

# Nested expansion
?expand=participant.event
```

## Category Values

Valid category values for items:
- `apero` — 🥂 Apéro
- `entree` — 🥗 Entrée
- `plat` — 🍖 Plat
- `dessert` — 🍰 Dessert
- `boissons` — 🍷 Boissons
- `jeux` — 🎲 Jeux / Activités
- `autre` — 📦 Autre

## Error Responses

PocketBase returns standard HTTP status codes:

- `200` — Success
- `201` — Created
- `204` — No Content (delete success)
- `400` — Bad Request (validation error)
- `404` — Not Found
- `500` — Server Error

Error response format:
```json
{
  "code": 400,
  "message": "Failed to create record.",
  "data": {
    "name": {
      "code": "validation_required",
      "message": "Missing required value."
    }
  }
}
```

## Tips

1. **Share Link Format:** `https://app.popote.io/s/{share_code}` or `https://app.popote.io/e/{event_id}`

2. **Device ID:** Generate a UUID on first app launch and store locally. Use for anonymous auth.

3. **Realtime:** Always subscribe to realtime for live updates. Reconnect on connection loss.

4. **Cascade Delete:** Deleting an event automatically deletes all related participants and items.

5. **Indexes:** Queries on `share_code`, `device_id`, and `event` relations are optimized with indexes.
