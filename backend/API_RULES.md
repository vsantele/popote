# API Access Rules

Configuration guide for PocketBase collection access rules.

## Current Status (MVP)

All rules are currently set to `""` (empty string = public access) for MVP development:
- ✅ Allows anonymous event creation
- ✅ Allows anyone to read events via share_code
- ✅ Allows participants to add items without authentication

**Important:** In PocketBase, `""` (empty string) = public access, `null` = admin-only access.

This is **intentional** for the MVP to match the "zero friction" requirement.

## Recommended Production Rules

Once ready for production, configure these rules in the PocketBase Admin UI:

### Events Collection

**List Rule:**
```javascript
// Allow listing only events where user is a participant (via device_id)
@request.auth.id != "" || 
@collection.participants.event.id ?= id && 
@collection.participants.device_id ?= @request.data.device_id
```

**View Rule:**
```javascript
// Anyone can view an event if they know the share_code or event ID
// This allows join-via-link functionality
id != ""
```

**Create Rule:**
```javascript
// Anyone can create an event (anonymous creation)
@request.data.name != "" && 
@request.data.date != "" && 
@request.data.host_name != "" && 
@request.data.host_device_id != ""
```

**Update Rule:**
```javascript
// Only the host (matched by device_id) can update the event
host_device_id = @request.data.device_id
```

**Delete Rule:**
```javascript
// Only the host can delete the event
host_device_id = @request.data.device_id
```

---

### Participants Collection

**List Rule:**
```javascript
// Anyone who knows the event can list participants
event != ""
```

**View Rule:**
```javascript
// Anyone can view a participant if they know the ID
id != ""
```

**Create Rule:**
```javascript
// Anyone can join as a participant (anonymous join)
@request.data.event != "" && 
@request.data.name != "" && 
@request.data.device_id != ""
```

**Update Rule:**
```javascript
// Only the participant themselves (matched by device_id) can update
device_id = @request.data.device_id
```

**Delete Rule:**
```javascript
// Participant can delete themselves, or host can delete others
device_id = @request.data.device_id ||
@collection.events.id ?= event && 
@collection.events.host_device_id ?= @request.data.device_id
```

---

### Items Collection

**List Rule:**
```javascript
// Anyone who knows the event can list items
event != ""
```

**View Rule:**
```javascript
// Anyone can view an item
id != ""
```

**Create Rule:**
```javascript
// Anyone who is a participant can create an item
@request.data.event != "" && 
@request.data.participant != "" && 
@request.data.name != "" && 
@request.data.category != ""
```

**Update Rule:**
```javascript
// Only the item owner (via participant's device_id) can update
@collection.participants.id ?= participant && 
@collection.participants.device_id ?= @request.data.device_id
```

**Delete Rule:**
```javascript
// Item owner or event host can delete
@collection.participants.id ?= participant && 
@collection.participants.device_id ?= @request.data.device_id ||
@collection.events.id ?= event && 
@collection.events.host_device_id ?= @request.data.device_id
```

---

## Device-Based Authentication Strategy

Since Popote uses anonymous authentication:

1. **Device ID Generation:**
   - Flutter app generates a UUID on first launch
   - Stored in local storage (SharedPreferences)
   - Used as anonymous identifier across all requests

2. **How It Works:**
   - No login/registration required
   - User actions tied to device_id
   - device_id is sent with each API request
   - Rules check device_id matches the owner

3. **Security Trade-offs:**
   - ✅ Zero friction UX
   - ✅ No password management
   - ✅ Fast onboarding
   - ⚠️ Changing devices = new identity
   - ⚠️ No device_id = no permission checks

## Applying Rules

### Via Admin UI (Recommended)

1. Navigate to http://127.0.0.1:8090/_/
2. Login as admin
3. Go to Collections → events/participants/items
4. Click "API Rules" tab
5. Paste rules from above
6. Save

### Via Migration (Advanced)

Create a new migration file:

```javascript
// pb_migrations/[timestamp]_update_collection_rules.js

migrate((db) => {
  const dao = new Dao(db)
  
  // Update events collection rules
  const eventsCollection = dao.findCollectionByNameOrId("events_collection_id")
  eventsCollection.viewRule = "id != ''"
  eventsCollection.createRule = "@request.data.name != '' && @request.data.host_device_id != ''"
  // ... add other rules
  
  dao.saveCollection(eventsCollection)
  
  // Repeat for participants and items
  
}, (db) => {
  // Rollback: set rules back to null
  const dao = new Dao(db)
  const eventsCollection = dao.findCollectionByNameOrId("events_collection_id")
  eventsCollection.viewRule = null
  eventsCollection.createRule = null
  dao.saveCollection(eventsCollection)
})
```

## Testing Rules

After applying rules, test with:

```bash
# Should succeed: Create event
curl -X POST http://127.0.0.1:8090/api/collections/events/records \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "date": "2024-12-31 20:00:00",
    "host_name": "Alice",
    "host_device_id": "device-alice-123"
  }'

# Should fail: Try to update event with wrong device_id
curl -X PATCH http://127.0.0.1:8090/api/collections/events/records/{event_id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hacked Event",
    "host_device_id": "device-hacker-999"
  }'
```

## Monitoring

Watch for failed requests in logs:

```bash
tail -f pb_data/logs/latest.log | grep "403"
```

## Future Enhancements

For v2+, consider:

1. **Rate Limiting:** Add custom middleware to prevent spam
2. **OAuth Integration:** Optional Google/Apple sign-in
3. **Invite-Only Events:** Add `is_public` flag with stricter rules
4. **Admin Roles:** Separate admin vs participant permissions

---

**Status:** MVP uses open rules (`null`) for rapid development. Apply production rules before public launch.
