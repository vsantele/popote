# Squad Decisions

## Active Decisions

### 1. State Management: Riverpod

**Status:** Approved  
**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Impact:** High (affects all Flutter code)

Use **Riverpod** for state management (not Provider or GetX).

**Rationale:**
- Compile-time safety (code-generated, typos fail at build-time)
- Native async & streaming support (FutureProvider, StreamProvider for SSE)
- No BuildContext required (cleaner separation of concerns)
- Lightweight (Riverpod only, faster compile times)
- Intuitive for small teams (providers as computed values)

**Implementation:**
- Repository layer: Provider-based dependency injection
- State layer: FutureProvider for API calls, StateProvider for UI state
- Real-time layer: StreamProvider.family for PocketBase subscriptions
- UI layer: ConsumerWidget/ConsumerStatefulWidget for integration

**Constraints:**
- No Provider package mixing
- All async operations use FutureProvider or StreamProvider
- Use Freezed or Equatable for model equality

**Approval Status:**
- ✅ Dallas (Flutter lead)
- ✅ Kane (Backend lead)
- ✅ Victor (Product)

---

### 2. Deep Linking & Share Code Strategy

**Status:** Approved  
**Proposed by:** Ripley (Lead)  
**Date:** 2026-03-22  
**Impact:** High (affects invite UX and backend)

Use **6-8 character alphanumeric share codes** combined with **platform-native deep linking** (App Links for Android, Universal Links for iOS).

**Link Format:** `https://popote.io/s/{shareCode}`  
**Example:** `https://popote.io/s/ABC123`

**Rationale:**
- No account dependency (works for guests who don't have app installed)
- Platform native deep linking (seamless UX, system trust)
- Stateless server logic (simple PocketBase query by share_code)
- Privacy (non-sequential codes, revocable, prevents enumeration)
- Works across SMS, WhatsApp, email, any text channel

**Implementation - Backend (Kane):**
- Add `share_code` field to events table (unique, indexed)
- Generate on creation: 8-char alphanumeric
- API: `GET /api/collections/events/records?filter=share_code='{code}'`
- Generate share codes in PocketBase hooks (atomic, no race conditions)

**Implementation - Frontend (Dallas):**
- Domain setup: Register `popote.io` and host `.well-known/assetlinks.json` and `apple-app-site-association`
- Deep link handler: Extract share code from path, fetch event, navigate to detail screen
- Test commands:
  - Android: `adb shell am start -W -a android.intent.action.VIEW -d "https://popote.io/s/ABC123" com.popote`
  - iOS: `xcrun simctl openurl booted "https://popote.io/s/ABC123"`

**Constraints:**
- Domain registration required before beta release
- SSL certificate required (no HTTP)
- App must be published to store for production-level reliability

**Rollback Plan:**
- Fall back to `Share` package with app store redirect if deep linking fails
- Slightly worse UX but functionally complete

**Approval Status:**
- ✅ Dallas (Flutter lead)
- ✅ Kane (Backend lead)
- ✅ Victor (Product)

---

### 3. Backend Architecture: PocketBase with JS Hooks

**Status:** Approved  
**Implemented by:** Kane (Backend)  
**Date:** 2026-03-22  
**Impact:** High (defines backend infrastructure)

Use **PocketBase JavaScript hooks** for backend business logic instead of external API layer.

**Rationale:**
- Zero additional infrastructure (runs inside PocketBase)
- Atomic operations (share_code generation is safe from race conditions)
- Direct database access (validation and constraints enforced)
- Single deployment artifact (simplified ops)
- Automatic host participant creation (no separate call needed)

**Trade-offs:**
- ⚠️ Logic coupled to PocketBase
- ⚠️ Testing requires PocketBase instance
- ⚠️ JavaScript (not TypeScript) for hooks

**Implementation:**
- `pb_hooks/main.pb.js` with:
  - Share code generation on event creation (6-char uppercase alphanumeric)
  - Auto-creation of host participant
  - Category validation for items
  - Uniqueness checks with retry logic (max 10 attempts)

**Collections:**
- `events`: id, name, date, location, description, host_name, host_device_id, share_code, created
- `participants`: id, event (FK), name, device_id, is_host, created
- `items`: id, event (FK), participant (FK), name, category (select), quantity, created

**Categories:** apero, entree, plat, dessert, boissons, jeux, autre (fixed enum)

**Patterns:**
- Device-based auth (device_id for anonymous users, no accounts required)
- Real-time sync via PocketBase SSE
- Share codes revocable by host
- Cascade delete (deleting event removes all participants and items)

**Scalability:**
- Current approach scales to ~10K events easily
- If business logic becomes complex: extract to separate service or migrate to PocketBase Go extensions

**Approval Status:**
- ✅ Dallas (Frontend lead)
- ✅ Ripley (Architect)
- ✅ Victor (Product)

---

### 4. Test Strategy: Hybrid Automated + Manual

**Status:** Approved  
**Proposed by:** Lambert (QA Lead)  
**Date:** 2026-03-22  
**Impact:** Medium (defines test methodology)

Adopt a **hybrid testing approach** combining automation and manual validation.

**Testing Strategy:**

1. **Automated Testing (Unit + Integration)**
   - Unit tests: Data models, validation logic, Riverpod state
   - Widget tests: Individual Flutter screens and components
   - Integration tests: Happy path flows (create → share → join → add)
   - Run on every commit via CI/CD (GitHub Actions)

2. **Manual Testing (Real-time + UX)**
   - Real-time sync: Requires 2+ physical devices to validate < 2s sync
   - Share link behavior: Test actual SMS, WhatsApp, email clients
   - Accessibility: VoiceOver/TalkBack navigation
   - Performance benchmarks: Timed manually or with profiling tools

3. **Test Execution Phases**
   - Phase 1: Core flows (creation, join, add)
   - Phase 2: Real-time sync validation
   - Phase 3: Edge cases (network, invalid inputs)
   - Phase 4: Performance benchmarks
   - Phase 5: Cross-platform validation

**Success Criteria to Validate:**
- Event creation: < 30 seconds
- Join + add item: < 20 seconds
- Real-time sync: item appears in < 2 seconds
- Zero signup required at any point

**Test Coverage:**
- 13 user flows (PRD-mapped)
- 31 edge cases and stress scenarios
- Performance benchmarks on real devices

**Trade-offs:**
- Manual testing requires 2+ physical devices (iOS + Android)
- Performance benchmarking adds time to test cycles
- Real-time sync tests may be flaky (network-dependent)

**Rationale:**
- Performance criteria are measurable (must collect actual timing data)
- Real-time sync cannot be fully automated (requires multi-device testing)
- Automation prevents regressions (core flows)
- Manual validation for UX (share links, accessibility)

**Approval Status:**
- ✅ Dallas (Frontend lead)
- ✅ Kane (Backend lead)
- ✅ Victor (Product)

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
