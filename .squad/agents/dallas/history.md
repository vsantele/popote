# Dallas — History

## Project Context

- **Project:** popote
- **Stack:** Flutter (mobile), PocketBase (backend)
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, mobile-first, temps réel
- **User:** Victor
- **Created:** 2026-03-22

**My focus:** Flutter UI, Material 3, state management (Riverpod/Provider), share functionality, deep linking

**Key UI screens:**
- E1: Accueil (liste des soirées)
- E2: Création de soirée (formulaire minimal)
- E3: Vue soirée (central — toggle par catégorie/personne)
- E4: Ajout d'item (bottom sheet)
- E5: Détail personne (optionnel v1)

## Learnings

### 2026-03-22: Flutter Project Initialization

**Task:** Initialize Popote Flutter app structure

**Architecture Decisions:**
- Chosen **Riverpod** over Provider for state management (more powerful, better DX)
- Structured project with clean separation: models, services, providers, screens, widgets
- Material 3 theming with custom color scheme (warm orange #FF6B35, teal #2A9D8F)
- Named routes for navigation simplicity
- Local storage for device ID, user name, and event tracking

**Key File Paths:**
- Entry point: `popote_app/lib/main.dart`
- Theme: `popote_app/lib/config/theme.dart`
- Routes: `popote_app/lib/config/routes.dart`
- Models: `popote_app/lib/models/` (event.dart, participant.dart, item.dart)
- Services: `popote_app/lib/services/` (pocketbase_service.dart, local_storage_service.dart)
- Providers: `popote_app/lib/providers/app_providers.dart`
- Screens: `popote_app/lib/screens/` (5 main screens)
- Constants: `popote_app/lib/utils/constants.dart`

**Dependencies Added:**
- flutter_riverpod (state management)
- pocketbase (backend SDK)
- share_plus (native sharing)
- uni_links (deep linking)
- shared_preferences (local storage)
- intl, uuid (utilities)

**Patterns Used:**
- Models with JSON serialization (fromJson/toJson)
- Models with copyWith for immutability
- Service layer abstraction (ready for backend integration)
- Provider-based dependency injection
- Bottom sheet for modal forms (AddItemSheet)
- Segmented button for view toggle (category/person)

**TODO Markers for Next Steps:**
- All PocketBase service methods marked with UnimplementedError
- Backend integration points clearly documented
- Deep link handling stub in place
- Real-time subscription placeholders ready

**User Preferences Noted:**
- User wants zero friction for guests (no accounts)
- Mobile-first approach
- Material 3 design language
- French language for UI text

**Coordination Notes:**
- Waiting for Kane to deploy PocketBase and provide URL
- PocketBase service stubs are ready for integration
- All screens have placeholder UI and TODO comments
- Structure follows PRD exactly (5 screens, 7 categories)

### 2025-01-XX - Phase 1 Complete Flutter Implementation
**Implemented complete Flutter app structure for Popote:**

**Architecture Decisions:**
- Adopted GoRouter (v13.2.0) for navigation instead of manual routes - provides type-safe routing, deep linking support, and better URL handling
- Created comprehensive Riverpod provider structure in `lib/providers/event_providers.dart`:
  - FutureProviders for one-time data fetching
  - StreamProvider for real-time items updates
  - StateProvider for UI state (view mode toggles)
  - Family providers for parameterized data (event by ID, items by event ID)
- Material 3 design system throughout - using primaryContainer, onPrimaryContainer for headers
- French language UI (no l10n setup yet, hardcoded strings)

**Key File Paths:**
- Navigation: `lib/config/router.dart` (GoRouter configuration with 5 routes + deep link handler)
- Providers: `lib/providers/event_providers.dart` (8 providers for state management)
- Main screens: `lib/screens/home_screen.dart`, `create_event_screen.dart`, `event_screen.dart`
- Widget: `lib/widgets/add_item_sheet.dart` (bottom sheet with participant creation flow)
- Models: `lib/models/event.dart`, `participant.dart`, `item.dart` (all with JSON serialization)
- Services: `lib/services/pocketbase_service.dart` (stubs awaiting Kane's backend work)

**Patterns Used:**
- AsyncValue pattern for loading/error/data states in UI
- StreamProvider for real-time data synchronization
- Family providers for parameterized queries
- ConsumerWidget/ConsumerStatefulWidget for Riverpod integration
- Bottom sheet for modal item addition
- SegmentedButton for view mode toggle (category/person)
- Card-based UI with expansion tiles for category grouping

**Coordination with Kane:**
- All PocketBase service methods are stubbed with UnimplementedError
- Service interface is defined and ready for implementation
- Real-time subscription architecture designed (SSE → StreamProvider)
- Models have toJson/fromJson for PocketBase compatibility

### 2026-03-22 — Phase 1 Team Decisions Approved

**Architecture Alignment:**
- ✅ Riverpod state management decision approved by all team members
- ✅ Deep linking strategy with share codes approved (GoRouter integration ready)
- ✅ PocketBase backend architecture approved (Kane's hooks implementation confirmed)
- ✅ Test strategy approved (Lambert's hybrid approach aligns with Flutter architecture)

**Coordination Handoff:**
- Backend (Kane): PocketBase complete, API contracts defined in API_EXAMPLES.md
- Frontend (Dallas): PocketBase service stubs ready for integration
- Testing (Lambert): Test plan covers all architectural decisions and phases
- Architecture (Ripley): All decisions documented and approved in .squad/decisions.md

**Implementation Ready:**
- GoRouter deep link handler configured for `https://popote.io/s/{shareCode}` pattern
- Riverpod providers structured for real-time SSE subscriptions
- Material 3 UI complete with warm color palette
- Device ID persistence ready for zero-friction auth
- Models aligned with backend schema (events, participants, items)

**Next Phase:**
- Integrate PocketBase service methods with Kane's API
- Test real-time sync with StreamProvider + SSE
- Validate deep linking in test environments
- Begin automated test suite execution

### 2026-03-22: Fixed Flutter Compilation Errors

**What was broken:**
- Missing `lib/widgets/add_item_sheet.dart` file causing import errors
- `createEvent()` method expected `Map<String, dynamic>` but received `Event` object
- `ItemCategory` type not recognized in event_screen.dart (treated as type instead of string)
- Missing `Categories.emoji()` and `Categories.label()` helper methods
- Category sorting failed because `.index` was called on string category values
- Missing `localStorageServiceProvider` in app_providers.dart

**How I fixed it:**
1. **Created AddItemSheet widget** (`lib/widgets/add_item_sheet.dart`):
   - Bottom sheet for adding items to events
   - Category selection with FilterChips for all 7 categories
   - Participant selection with dropdown or new participant input flow
   - Form validation and error handling
   - Integration with Riverpod providers for data submission

2. **Fixed PocketBaseService.createEvent()**:
   - Changed signature from `Map<String, dynamic>` to `dynamic`
   - Added type checking to handle both `Event` objects and `Map<String, dynamic>`
   - Converts Event to Map using `toJson()` when needed
   - Implemented the actual PocketBase call (removed UnimplementedError)

3. **Fixed ItemCategory type issues**:
   - Created `ItemCategory` enum in constants.dart for type safety
   - Changed event_screen.dart to use `<String, List<Item>>` instead of `<ItemCategory, List<Item>>`
   - Updated sorting to use `Categories.all.indexOf()` for proper ordering

4. **Added Categories helper methods**:
   - Added `Categories.emoji()` and `Categories.label()` as aliases to existing methods
   - These methods extract emoji and label text from category strings

5. **Fixed provider issues**:
   - Added `localStorageServiceProvider` to app_providers.dart
   - Fixed unused variable warnings in event_providers.dart
   - Updated add_item_sheet to use `deviceIdProvider.future` instead of static method call

6. **Cleanup**:
   - Deleted unused `lib/config/routes.dart` file (app uses router.dart with GoRouter)
   - Removed unused imports from add_item_sheet.dart

**Result:** All compilation errors resolved. Only 3 info-level warnings remain (deprecated withOpacity, prefer_const_constructors) which don't block compilation.

### 2026-03-22 — Team Coordination Update: Backend Ready for Integration

**Status:** ✅ Phase 1 Complete  
**Coordination:** Kane completed PocketBase v0.36.7 migration fixes

**Backend Ready:**
- PocketBase server running on http://127.0.0.1:8090
- All 3 collections (events, participants, items) created successfully
- Share code generation and auto-host creation working
- API contracts documented in backend/API_EXAMPLES.md

**Next Steps for Dallas:**
- Integrate PocketBase service methods using Kane's API contracts
- Test real-time SSE subscriptions with StreamProvider
- Validate deep linking handler with share codes
- Prepare for Lambert's integration test suite

**Team Status:**
- ✅ Dallas: Flutter app compiling, ready for backend integration
- ✅ Kane: Backend fully operational, API ready
- 🔄 Lambert: Preparing test automation against live API
- ✅ Ripley: All architectural decisions documented and approved

