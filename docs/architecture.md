# Popote Architecture Proposal

**Status:** Proposed (Ripley)  
**Date:** 2026-03-22  
**Reviewers:** Dallas (Flutter), Kane (Backend)

---

## 1. Project Structure

```
popote/
├── frontend/                          # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── core/
│   │   │   ├── constants/
│   │   │   ├── utils/
│   │   │   └── di.dart                # Dependency injection (Riverpod setup)
│   │   ├── models/                    # Data classes (Event, Participant, Item)
│   │   ├── providers/                 # Riverpod providers (state management)
│   │   │   ├── event_provider.dart
│   │   │   ├── participant_provider.dart
│   │   │   └── item_provider.dart
│   │   ├── services/                  # API/backend communication layer
│   │   │   ├── pocketbase_service.dart
│   │   │   ├── event_service.dart
│   │   │   ├── participant_service.dart
│   │   │   └── item_service.dart
│   │   ├── repositories/              # Data access layer
│   │   │   ├── event_repository.dart
│   │   │   ├── participant_repository.dart
│   │   │   └── item_repository.dart
│   │   ├── screens/
│   │   │   ├── home_screen.dart       # Event list
│   │   │   ├── event_detail_screen.dart # Main event view
│   │   │   ├── create_event_screen.dart
│   │   │   ├── add_item_sheet.dart    # Bottom sheet
│   │   │   └── edit_item_sheet.dart
│   │   ├── widgets/
│   │   │   ├── category_selector.dart
│   │   │   ├── event_header.dart
│   │   │   ├── item_card.dart
│   │   │   ├── participant_section.dart
│   │   │   └── view_toggle.dart       # Category/Person toggle
│   │   ├── navigation/
│   │   │   ├── router.dart            # GoRouter config
│   │   │   └── deep_link_handler.dart
│   │   └── l10n/                      # Localization (optional for MVP)
│   ├── pubspec.yaml
│   ├── test/                          # Unit & widget tests
│   └── ios/ + android/                # Platform-specific configs
│
├── backend/                           # PocketBase
│   ├── pb_migrations/                 # Version-controlled migrations
│   ├── pb_hooks/                      # Server-side hooks (if needed)
│   ├── pocketbase.yaml                # Configuration
│   └── README.md                      # Setup instructions
│
├── docs/
│   ├── architecture.md               # This file
│   ├── cahier_charge.md              # Requirements
│   ├── deployment.md                 # (Future)
│   └── api_spec.md                   # (Future)
│
└── README.md                          # Project overview
```

---

## 2. Architecture Decisions

### 2.1 Frontend Architecture: Layered Pattern

```
┌─────────────────────────────────────┐
│    UI Layer (Screens & Widgets)     │
├─────────────────────────────────────┤
│  State Management (Riverpod)        │
├─────────────────────────────────────┤
│  Services (API/PocketBase)          │
├─────────────────────────────────────┤
│  Repositories (Cache + Network)     │
├─────────────────────────────────────┤
│  Models (Data classes)              │
└─────────────────────────────────────┘
```

**Why this structure?**
- **Separation of concerns:** Each layer has a single responsibility
- **Testability:** Services, repositories, and providers can be tested in isolation
- **Reusability:** Services are consumed by providers, which are consumed by widgets
- **Maintainability:** Clear paths for Dallas to add UI and Kane to adjust backend

### 2.2 State Management: Riverpod

**Decision:** Use **Riverpod** (not Provider)

**Reasoning:**
- ✅ Compile-time safe (no runtime errors from typos)
- ✅ Built-in async handling (FutureProvider, StreamProvider)
- ✅ No need for BuildContext in many cases
- ✅ Better for real-time data (StreamProvider for SSE from PocketBase)
- ✅ Lighter learning curve than Redux for a small team

**Implementation approach:**
```dart
// Event list provider
final eventsProvider = FutureProvider<List<Event>>((ref) async {
  return ref.watch(eventRepositoryProvider).listUserEvents();
});

// Real-time items stream for an event
final itemsStreamProvider = StreamProvider.family<List<Item>, String>((ref, eventId) {
  return ref.watch(pocketbaseServiceProvider).subscribeToItems(eventId);
});

// Selected event provider (local state)
final selectedEventProvider = StateProvider<String?>((ref) => null);
```

### 2.3 Backend: PocketBase Architecture

**Collections (Core):**
- `events` — Event metadata
- `participants` — Users per event
- `items` — What each participant brings

**PocketBase Features Used:**
- **Auth:** Anonymous token (device_id as identifier)
- **Realtime:** SSE subscriptions for items updates
- **Rules:** Row-level security:
  - Users can only create events under their device_id
  - Users can modify only their own items
  - Users can read all event details once joined
- **Migrations:** Version-controlled schema updates

### 2.4 Communication Protocol

**REST API via PocketBase:**
```
POST /api/collections/events/records          # Create event
GET  /api/collections/events/records/{id}     # Get event details
GET  /api/collections/items/records?event={id}  # List items
POST /api/collections/items/records           # Add item
PATCH /api/collections/items/records/{id}     # Edit item
DELETE /api/collections/items/records/{id}    # Delete item
```

**Real-time Updates:**
- PocketBase SSE subscription to `items` collection filtered by event_id
- Update to Riverpod StreamProvider automatically triggers UI rebuild

---

## 3. Navigation & Deep Linking Strategy

### 3.1 Router Configuration (GoRouter)

```dart
final routerProvider = Provider((ref) {
  return GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => HomeScreen(),
        routes: [
          GoRoute(
            path: 'create',
            builder: (context, state) => CreateEventScreen(),
          ),
          GoRoute(
            path: 'events/:eventId',
            builder: (context, state) {
              final eventId = state.params['eventId']!;
              return EventDetailScreen(eventId: eventId);
            },
          ),
        ],
      ),
    ],
    redirect: (context, state) async {
      // Deep link handling
      return null;
    },
  );
});
```

### 3.2 Deep Linking Strategy

**Link Format:** `https://popote.io/s/{shareCode}`

**Implementation:**
1. **iOS:** Universal Links (`apple-app-site-association` file)
2. **Android:** App Links (`assetlinks.json` file)
3. **Fallback:** Web browser → redirect to app store or web version

**Flow:**
```
User clicks link
    ↓
Deep link handler captures `shareCode`
    ↓
Query PocketBase: `events?filter=share_code='{code}'`
    ↓
Navigate to EventDetailScreen(eventId)
    ↓
Auto-join participant if first time
```

**Local Device ID Persistence:**
- Store `device_id` in app local storage (SharedPreferences)
- Use same device_id for all events on this device
- Allows user to see "their" items across events

---

## 4. Local Storage Approach

### 4.1 Persistent Data (SQLite via `drift`)

Store minimal offline data:
- **User device_id** (one-time generation + persist)
- **Last seen events** (recent 10, for quick access)
- **Draft items** (if user is composing offline)

```dart
// Example drift table
@DataClassName('CachedEvent')
class EventsTable extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  DateTimeColumn get date => dateTime()();
  IntColumn get syncedAt => integer()(); // timestamp
  
  @override
  Set<Column> get primaryKey => {id};
}
```

### 4.2 Runtime State (Riverpod in-memory)

- Event list
- Items for current event
- Participant list
- UI state (view toggle, selected event)

**Why not persist everything?**
- Events are transient (they're parties, not persistent data)
- Network is fast; re-fetching is simpler than managing cache invalidation
- Reduces app size and complexity

---

## 5. Share Mechanism

### 5.1 Host Share Flow

```dart
// In EventDetailScreen
ElevatedButton(
  onPressed: () {
    final event = ref.watch(selectedEventProvider);
    final shareCode = event.shareCode;
    final deepLink = 'https://popote.io/s/$shareCode';
    
    Share.share(
      'Join "$${event.name}" on Popote!\n$deepLink',
      subject: '${event.name}',
    );
  },
  child: Text('Share Event'),
),
```

### 5.2 Share Code Generation (Backend)

```javascript
// PocketBase hook: onCreate for events collection
onCreate: (c) => {
  c.Record.Set('share_code', generateShortCode());
}

// generateShortCode() → 6-8 character alphanumeric unique code
```

### 5.3 Invited Guest Flow

1. Guest receives link via SMS/WhatsApp → `https://popote.io/s/ABC123`
2. Clicks link → deep link handler extracts `ABC123`
3. App queries: `events?filter=share_code='ABC123'`
4. Redirects to EventDetailScreen(eventId)
5. User enters first name → auto-creates Participant record
6. Can now add items

---

## 6. Data Models

### 6.1 Event Model
```dart
class Event {
  String id;
  String name;
  DateTime date;
  String? location;
  String? description;
  String hostName;
  String hostDeviceId;
  String shareCode;
  DateTime created;
}
```

### 6.2 Participant Model
```dart
class Participant {
  String id;
  String eventId;
  String name;
  String deviceId;
  bool isHost;
  DateTime created;
}
```

### 6.3 Item Model
```dart
class Item {
  String id;
  String eventId;
  String participantId;
  String name;
  ItemCategory category; // enum
  String? quantity;
  DateTime created;
}

enum ItemCategory {
  apero, entree, plat, dessert, boissons, jeux, autre
}
```

---

## 7. Development Phases

### Phase 1: Foundation (Week 1-2)
**Dallas:** Setup Flutter project, models, routing skeleton  
**Kane:** Initialize PocketBase, create collections, deploy

**Deliverables:**
- Flutter app compiles
- PocketBase runs locally with schema
- Basic navigation works (HomeScreen → CreateEventScreen)

### Phase 2: Core Features (Week 3-4)
**Dallas:** Create event form, event detail screen, item list UI, basic Riverpod integration  
**Kane:** PocketBase API endpoints, authentication rules, real-time SSE setup

**Deliverables:**
- Host can create event (< 30 seconds)
- Guest can join via deep link
- Item list displays (mock data at first)

### Phase 3: Real-time Sync (Week 5)
**Dallas:** Implement Riverpod StreamProvider for real-time items, optimistic updates  
**Kane:** Debug SSE, ensure row-level permissions work

**Deliverables:**
- Multiple clients see items appear in real-time
- No stale data

### Phase 4: Polish & Testing (Week 6)
**Dallas:** Error handling, offline resilience, unit/widget tests  
**Kane:** API validation, security testing

**Deliverables:**
- App handles poor connectivity gracefully
- All major features tested
- Ready for beta

### Phase 5: Deployment (Week 7)
**Kane:** Deploy PocketBase to production (PocketHost or self-hosted)  
**Dallas:** Release to TestFlight (iOS) + internal beta (Android)

---

## 8. Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State Management** | Riverpod | Type-safe, excellent async/streaming support |
| **Navigation** | GoRouter | Modern, deep-link native, URL-based routing |
| **Backend** | PocketBase | SQLite + REST API + SSE, perfect for MVP, no backend dev overhead |
| **Offline Storage** | SQLite (drift) | Minimal; only store device_id + cache recent events |
| **Real-time Updates** | PocketBase SSE → StreamProvider | Native to PocketBase, simple, no WebSocket complexity |
| **Device Identification** | Local device_id (UUID) | No account overhead, persistent across events |
| **Auth Model** | Anonymous + device_id | Matches "zero friction" requirement |
| **Share Mechanism** | Deep link + share sheet | Native UX, no custom flows |
| **UI Theme** | Material 3 | Flutter standard, minimal customization |

---

## 9. Security & Privacy

### 9.1 PocketBase Rules

**Events:** 
- Host can create/edit/delete own events
- Any participant can read event details
- Others cannot read until they join

**Items:**
- Participant can create/edit/delete own items only
- Other participants can read all items
- Cannot modify another's item

**Participants:**
- Host can list participants
- Cannot view participants from other events

### 9.2 Data Retention

- Events remain visible to participants for reference
- No automatic deletion (host can manually delete)
- No personally identifiable information beyond first name

---

## 10. Scalability Notes

**Current scope (MVP):** 100-500 events running simultaneously, ~10-50 participants per event

**Future considerations:**
- Event archival/cleanup for events > 6 months old
- Participant rate limiting (prevent spam item adds)
- Geographic distribution (PocketHost multi-region)
- CDN for web version of deep links

---

## 11. Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Deep link failure | Fallback to web browser redirect to app store |
| Real-time lag | Cache items locally, show optimistic updates |
| Device ID spoofing | Accept it for MVP; add server-side validation in v2 |
| PocketBase downtime | Self-host + backup, or use PocketHost with uptime SLA |

---

## 12. Next Steps for Team

### For Dallas (Flutter):
1. ✅ Read this architecture doc
2. ✅ Review project structure above
3. → Initialize Flutter project with Riverpod + GoRouter
4. → Create models and stub services
5. → Build UI screens (no API calls yet)

### For Kane (Backend):
1. ✅ Read this architecture doc
2. ✅ Review data models (section 6)
3. → Initialize PocketBase locally
4. → Create collections (`events`, `participants`, `items`)
5. → Configure authentication rules (anonymous + device_id)
6. → Deploy to PocketHost or self-host

### Sign-off Checklist:
- [ ] Dallas approves Flutter structure & state management
- [ ] Kane approves PocketBase schema & auth model
- [ ] Victor signs off on timeline

---

**Approved by:** _______________  
**Date:** _______________

