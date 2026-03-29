# API Routes Documentation

Complete REST API implementation for Popote backend.

---

## Base URL

Local dev: `http://localhost:5173/api`  
Production: `https://popote.io/api`

---

## Authentication

All routes use **device-based authentication**:
- Device ID generated client-side via `crypto.randomUUID()`
- Stored in `localStorage` as `popote_device_id`
- Sent via cookie or request body/query param
- No accounts required

---

## Endpoints

### **POST /api/events**

Create a new event with auto-generated share code.

**Request:**
```json
{
  "name": "Summer BBQ",
  "date": "2026-07-15T18:00:00Z",
  "location": "Central Park",
  "description": "Bring your favorite dish!",
  "hostName": "Alice",
  "hostDeviceId": "device-uuid-123"
}
```

**Response (201):**
```json
{
  "id": 1,
  "shareCode": "ABC123",
  "event": {
    "id": 1,
    "name": "Summer BBQ",
    "date": "2026-07-15T18:00:00Z",
    "location": "Central Park",
    "description": "Bring your favorite dish!",
    "hostName": "Alice",
    "hostDeviceId": "device-uuid-123",
    "shareCode": "ABC123",
    "createdAt": "2026-03-23T22:30:00Z",
    "updatedAt": "2026-03-23T22:30:00Z"
  }
}
```

**Errors:**
- `400`: Missing required fields
- `500`: Internal server error

---

### **GET /api/events/[code]**

Get event details by share code.

**Example:** `GET /api/events/ABC123`

**Response (200):**
```json
{
  "event": {
    "id": 1,
    "name": "Summer BBQ",
    "date": "2026-07-15T18:00:00Z",
    "location": "Central Park",
    "description": "Bring your favorite dish!",
    "hostName": "Alice",
    "hostDeviceId": "device-uuid-123",
    "shareCode": "ABC123",
    "createdAt": "2026-03-23T22:30:00Z",
    "updatedAt": "2026-03-23T22:30:00Z"
  },
  "participants": [
    {
      "id": 1,
      "eventId": 1,
      "name": "Alice",
      "deviceId": "device-uuid-123",
      "isHost": true,
      "createdAt": "2026-03-23T22:30:00Z",
      "updatedAt": "2026-03-23T22:30:00Z"
    }
  ],
  "items": []
}
```

**Errors:**
- `400`: Invalid share code format
- `404`: Event not found
- `500`: Internal server error

---

### **POST /api/events/[code]/join**

Join an event as a participant.

**Example:** `POST /api/events/ABC123/join`

**Request:**
```json
{
  "name": "Bob",
  "deviceId": "device-uuid-456"
}
```

**Response (201):**
```json
{
  "participant": {
    "id": 2,
    "eventId": 1,
    "name": "Bob",
    "deviceId": "device-uuid-456",
    "isHost": false,
    "createdAt": "2026-03-23T22:35:00Z",
    "updatedAt": "2026-03-23T22:35:00Z"
  }
}
```

**Errors:**
- `400`: Invalid share code format or missing fields
- `404`: Event not found
- `409`: Already joined (device ID already exists for this event)
- `500`: Internal server error

---

### **POST /api/items**

Add an item to an event.

**Request:**
```json
{
  "eventId": 1,
  "name": "Grilled veggies",
  "category": "plat",
  "quantity": "2 platters",
  "deviceId": "device-uuid-456"
}
```

**Valid categories:**
- `apero` (appetizers)
- `entree` (starters)
- `plat` (main dishes)
- `dessert` (desserts)
- `boissons` (drinks)
- `jeux` (games)
- `autre` (other)

**Response (201):**
```json
{
  "item": {
    "id": 1,
    "eventId": 1,
    "participantId": 2,
    "name": "Grilled veggies",
    "category": "plat",
    "quantity": "2 platters",
    "createdAt": "2026-03-23T22:40:00Z",
    "updatedAt": "2026-03-23T22:40:00Z"
  }
}
```

**Errors:**
- `400`: Missing fields or invalid category
- `403`: Not a participant (device ID not found for this event)
- `500`: Internal server error

---

### **GET /api/events/[code]/items**

List all items for an event.

**Example:** `GET /api/events/ABC123/items`

**Response (200):**
```json
{
  "items": [
    {
      "id": 1,
      "eventId": 1,
      "participantId": 2,
      "name": "Grilled veggies",
      "category": "plat",
      "quantity": "2 platters",
      "createdAt": "2026-03-23T22:40:00Z",
      "updatedAt": "2026-03-23T22:40:00Z",
      "participant": {
        "id": 2,
        "eventId": 1,
        "name": "Bob",
        "deviceId": "device-uuid-456",
        "isHost": false,
        "createdAt": "2026-03-23T22:35:00Z",
        "updatedAt": "2026-03-23T22:35:00Z"
      }
    }
  ]
}
```

**Errors:**
- `400`: Invalid share code format
- `404`: Event not found
- `500`: Internal server error

---

### **DELETE /api/items/[id]**

Delete an item (owner only).

**Example:** `DELETE /api/items/1?deviceId=device-uuid-456`

**Response (204):** No content (success)

**Errors:**
- `400`: Missing deviceId or invalid item ID
- `403`: Not authorized (device ID doesn't match item creator)
- `404`: Item not found
- `500`: Internal server error

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

---

## Testing Examples

### Using cURL

**Create event:**
```bash
curl -X POST http://localhost:5173/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer BBQ",
    "date": "2026-07-15T18:00:00Z",
    "hostName": "Alice",
    "hostDeviceId": "device-123"
  }'
```

**Get event:**
```bash
curl http://localhost:5173/api/events/ABC123
```

**Join event:**
```bash
curl -X POST http://localhost:5173/api/events/ABC123/join \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "deviceId": "device-456"
  }'
```

**Add item:**
```bash
curl -X POST http://localhost:5173/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 1,
    "name": "Grilled veggies",
    "category": "plat",
    "deviceId": "device-456"
  }'
```

**Delete item:**
```bash
curl -X DELETE "http://localhost:5173/api/items/1?deviceId=device-456"
```

---

## Integration with Frontend

**Import auth utility:**
```typescript
import { getDeviceId } from '$lib/auth';
```

**Create event from SvelteKit component:**
```typescript
const deviceId = getDeviceId();

const response = await fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: eventName,
    date: eventDate,
    hostName: userName,
    hostDeviceId: deviceId
  })
});

const { shareCode, event } = await response.json();
```

**Join event:**
```typescript
const deviceId = getDeviceId();

const response = await fetch(`/api/events/${shareCode}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: userName,
    deviceId
  })
});

const { participant } = await response.json();
```

---

## Real-time Sync

**Current approach:** Polling (3-second interval)

**Implementation:**
```typescript
let pollInterval: NodeJS.Timeout;

onMount(() => {
  pollInterval = setInterval(async () => {
    const response = await fetch(`/api/events/${shareCode}`);
    const { event, participants, items } = await response.json();
    // Update local state
  }, 3000);
  
  return () => clearInterval(pollInterval);
});
```

**Future:** WebSockets for < 1s latency (if needed)

---

## Security Notes

1. **Device ID Spoofing:** Device IDs are UUIDs (hard to guess) but not cryptographically secure
2. **Rate Limiting:** Not yet implemented (TODO)
3. **Input Validation:** All required fields validated, categories validated
4. **Authorization:** Device ID checked for ownership on update/delete operations

---

**Status:** ✅ All routes implemented and ready for testing  
**Next:** Start Aspire → Run migrations → Test with frontend
