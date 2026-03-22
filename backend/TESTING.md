# Backend Verification Test Suite

Quick verification tests to ensure the Popote backend is correctly configured.

## Prerequisites

- PocketBase executable downloaded and placed in `backend/` directory
- PocketBase server running (`.\start.ps1` or `./start.sh`)
- Admin account created at http://127.0.0.1:8090/_/

## Test Suite

### 1. Health Check

```bash
# Test: Server is running
curl http://127.0.0.1:8090/api/health

# Expected: HTTP 200 with health status
```

### 2. Collections Exist

```bash
# Test: List all collections
curl http://127.0.0.1:8090/api/collections

# Expected: JSON response with events, participants, items collections
```

### 3. Create Event (Share Code Auto-generation)

```bash
# Test: Create event and verify share_code is generated
curl -X POST http://127.0.0.1:8090/api/collections/events/records \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test BBQ",
    "date": "2024-12-31 18:00:00",
    "location": "123 Test Street",
    "description": "Test event for backend verification",
    "host_name": "TestUser",
    "host_device_id": "test-device-12345"
  }'

# Expected: 
# - HTTP 201 Created
# - Response contains auto-generated share_code (6 uppercase alphanumeric chars)
# - Example: {"id":"...", "share_code":"A3B7X2", ...}

# Save the event ID and share_code for next tests
# EVENT_ID=<copy from response>
# SHARE_CODE=<copy from response>
```

### 4. Verify Host Participant Auto-creation

```bash
# Test: Host participant was automatically created
curl "http://127.0.0.1:8090/api/collections/participants/records?filter=(event='EVENT_ID')"

# Expected:
# - HTTP 200
# - One participant record exists
# - participant.name = "TestUser"
# - participant.device_id = "test-device-12345"
# - participant.is_host = true
```

### 5. Get Event by Share Code

```bash
# Test: Find event using share_code
curl "http://127.0.0.1:8090/api/collections/events/records?filter=(share_code='SHARE_CODE')"

# Expected:
# - HTTP 200
# - Returns the event created in test #3
```

### 6. Add Participant

```bash
# Test: Guest joins event
curl -X POST http://127.0.0.1:8090/api/collections/participants/records \
  -H "Content-Type: application/json" \
  -d '{
    "event": "EVENT_ID",
    "name": "GuestUser",
    "device_id": "guest-device-67890",
    "is_host": false
  }'

# Expected:
# - HTTP 201 Created
# - Response contains participant record
# Save PARTICIPANT_ID for next test
```

### 7. Create Item with Valid Category

```bash
# Test: Add item with valid category
curl -X POST http://127.0.0.1:8090/api/collections/items/records \
  -H "Content-Type: application/json" \
  -d '{
    "event": "EVENT_ID",
    "participant": "PARTICIPANT_ID",
    "name": "Tiramisu maison",
    "category": "dessert",
    "quantity": "pour 8 personnes"
  }'

# Expected:
# - HTTP 201 Created
# - Item created successfully
```

### 8. Create Item with Invalid Category (Should Fail)

```bash
# Test: Category validation hook
curl -X POST http://127.0.0.1:8090/api/collections/items/records \
  -H "Content-Type: application/json" \
  -d '{
    "event": "EVENT_ID",
    "participant": "PARTICIPANT_ID",
    "name": "Invalid Item",
    "category": "invalid_category",
    "quantity": "1"
  }'

# Expected:
# - HTTP 400 Bad Request
# - Error message: "Invalid category. Must be one of: apero, entree, plat, dessert, boissons, jeux, autre"
```

### 9. List Items by Category

```bash
# Test: Filter items by category
curl "http://127.0.0.1:8090/api/collections/items/records?filter=(event='EVENT_ID'%26%26category='dessert')"

# Expected:
# - HTTP 200
# - Returns the item created in test #7
```

### 10. Expand Relations

```bash
# Test: Get event with expanded participants and items
curl "http://127.0.0.1:8090/api/collections/events/records/EVENT_ID?expand=participants,items"

# Expected:
# - HTTP 200
# - Response includes nested participant and item data
# - expand.participants contains host and guest
# - expand.items contains the dessert item
```

### 11. Cascade Delete

```bash
# Test: Delete event and verify participants/items are deleted
curl -X DELETE http://127.0.0.1:8090/api/collections/events/records/EVENT_ID

# Verify participants deleted
curl "http://127.0.0.1:8090/api/collections/participants/records?filter=(event='EVENT_ID')"

# Verify items deleted
curl "http://127.0.0.1:8090/api/collections/items/records?filter=(event='EVENT_ID')"

# Expected:
# - Event deletion: HTTP 204 No Content
# - Participants query: Empty array
# - Items query: Empty array
```

### 12. Realtime Subscription (JavaScript)

```javascript
// Test: Subscribe to realtime updates
const eventSource = new EventSource('http://127.0.0.1:8090/api/realtime');

eventSource.addEventListener('PB_CONNECT', (e) => {
  console.log('✅ Connected to realtime');
});

// Subscribe to items collection
eventSource.addEventListener('items', (e) => {
  const data = JSON.parse(e.data);
  console.log('📦 Item update:', data.action, data.record);
  // data.action: "create", "update", or "delete"
});

// Create an item in another terminal/browser
// Verify the event fires and logs the new item
```

## Automated Test Script

Save as `test-backend.sh` (Linux/macOS) or `test-backend.ps1` (Windows):

```bash
#!/bin/bash

echo "🧪 Testing Popote Backend..."

# Test 1: Health check
echo ""
echo "Test 1: Health Check"
curl -s http://127.0.0.1:8090/api/health && echo "✅ Server is running" || echo "❌ Server not responding"

# Test 2: Create event
echo ""
echo "Test 2: Create Event"
RESPONSE=$(curl -s -X POST http://127.0.0.1:8090/api/collections/events/records \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "date": "2024-12-31 20:00:00",
    "host_name": "Tester",
    "host_device_id": "test-123"
  }')

EVENT_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
SHARE_CODE=$(echo $RESPONSE | grep -o '"share_code":"[^"]*' | cut -d'"' -f4)

if [ -n "$SHARE_CODE" ]; then
  echo "✅ Event created with share_code: $SHARE_CODE"
else
  echo "❌ Share code not generated"
fi

# Test 3: Verify host participant
echo ""
echo "Test 3: Host Participant Auto-creation"
PARTICIPANTS=$(curl -s "http://127.0.0.1:8090/api/collections/participants/records?filter=(event='$EVENT_ID')")
if echo $PARTICIPANTS | grep -q "Tester"; then
  echo "✅ Host participant auto-created"
else
  echo "❌ Host participant not found"
fi

# Test 4: Invalid category
echo ""
echo "Test 4: Category Validation"
ERROR_RESPONSE=$(curl -s -X POST http://127.0.0.1:8090/api/collections/items/records \
  -H "Content-Type: application/json" \
  -d "{
    \"event\": \"$EVENT_ID\",
    \"participant\": \"dummy\",
    \"name\": \"Test\",
    \"category\": \"invalid\"
  }")

if echo $ERROR_RESPONSE | grep -q "Invalid category"; then
  echo "✅ Category validation working"
else
  echo "❌ Category validation not working"
fi

# Cleanup
echo ""
echo "Cleaning up test data..."
curl -s -X DELETE http://127.0.0.1:8090/api/collections/events/records/$EVENT_ID > /dev/null

echo ""
echo "✅ All tests complete!"
```

## Expected Results Summary

| Test | Expected Result | Status |
|------|----------------|--------|
| Health Check | HTTP 200 | ⏳ |
| Collections Exist | events, participants, items listed | ⏳ |
| Create Event | share_code auto-generated | ⏳ |
| Host Participant | Auto-created with is_host=true | ⏳ |
| Get by Share Code | Event found | ⏳ |
| Add Participant | Guest joins successfully | ⏳ |
| Valid Category Item | Item created | ⏳ |
| Invalid Category Item | HTTP 400 error | ⏳ |
| Filter by Category | Dessert items returned | ⏳ |
| Expand Relations | Nested data included | ⏳ |
| Cascade Delete | Participants/items deleted | ⏳ |
| Realtime | Events fire on changes | ⏳ |

## Common Issues

### Port 8090 Already in Use
```bash
# Windows
netstat -ano | findstr :8090
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:8090 | xargs kill -9
```

### Migrations Not Applied
- Delete `pb_data/` directory
- Restart PocketBase to re-apply migrations

### Hooks Not Working
- Check `pb_data/logs/latest.log` for JavaScript errors
- Verify `pb_hooks/main.pb.js` syntax
- Restart PocketBase after hook changes

## Success Criteria

All tests pass means:
- ✅ PocketBase is running correctly
- ✅ Collections are created with proper schema
- ✅ Hooks are executing (share_code, host participant, validation)
- ✅ API is accessible and functional
- ✅ Cascade delete is working
- ✅ Ready for Flutter integration

---

**Next Step:** Share backend URL with Dallas for Flutter integration.
