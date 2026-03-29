# Test Plan — Popote

**Version:** 1.0  
**Date:** 2025-03-22  
**Tester:** Lambert

---

## 1. Test Objectives

Validate that the Popote app meets all PRD requirements, particularly:
- **Zero friction UX** — no mandatory accounts, minimal steps
- **Performance benchmarks** — creation < 30s, join+add < 20s, real-time < 2s
- **Mobile-first reliability** — works on iOS/Android with Flutter
- **Real-time sync** — PocketBase SSE ensures items appear instantly

---

## 2. Success Criteria Validation

### SC-1: Event Creation Speed (< 30 seconds)
**Acceptance:** From app launch to shareable link displayed

**Test Cases:**
- **TC-1.1** — New user, first event creation (includes any onboarding)
- **TC-1.2** — Returning user, creating second event
- **TC-1.3** — Host fills all optional fields (location, description)
- **TC-1.4** — Host fills only mandatory fields (name, date)

**Measurements:**
- Timed from "Create Event" button tap to share sheet available
- Benchmark: 95th percentile < 30 seconds

**Edge Cases:**
- Very long event names (> 100 chars)
- Date picker interactions on different locales
- Network latency during event creation

---

### SC-2: Guest Join + Add Item Speed (< 20 seconds)
**Acceptance:** From link click to item visible in list

**Test Cases:**
- **TC-2.1** — First-time guest (must enter name)
- **TC-2.2** — Returning guest (name cached locally)
- **TC-2.3** — Guest adds minimal item (name only, default category)
- **TC-2.4** — Guest adds full item (name, category, quantity)

**Measurements:**
- Timed from link open to item submitted and visible in own view
- Benchmark: 95th percentile < 20 seconds

**Edge Cases:**
- Invalid/expired share codes
- Network interruption during name submission
- Very long item names or quantities
- Special characters in item names (emoji, accents)

---

### SC-3: Zero Registration Required
**Acceptance:** No account creation, email, or password requested

**Test Cases:**
- **TC-3.1** — Guest can join event without any authentication
- **TC-3.2** — Guest name stored locally (device_id based)
- **TC-3.3** — Host identified by device_id only
- **TC-3.4** — Multiple guests from different devices can join simultaneously

**Edge Cases:**
- Same device used by multiple people (should allow name change)
- Device data cleared (name should be re-requested, not block usage)
- Web fallback behavior (no device_id, use session storage)

---

### SC-4: Real-Time Sync (< 2 seconds)
**Acceptance:** Item added by user A appears in user B's view in < 2s

**Test Cases:**
- **TC-4.1** — Two devices viewing same event, one adds item
- **TC-4.2** — Five devices viewing same event, all add items concurrently
- **TC-4.3** — Item deleted by creator, disappears in others' views
- **TC-4.4** — Item edited by creator, updates in others' views
- **TC-4.5** — Host deletes any item (moderation), disappears for all

**Measurements:**
- Timestamp when item submitted vs. when it appears in other views
- Benchmark: 99th percentile < 2 seconds (PocketBase SSE)

**Edge Cases:**
- One user offline, others online (item should sync when back online)
- Network switch (WiFi to cellular) during event view
- PocketBase SSE connection drop and reconnect
- Rapid concurrent edits to same item (last-write-wins behavior)

---

## 3. User Flow Tests

### UF-1: Host Creates Event and Shares

**Scenario:**
1. Host opens app (home screen shows "Create Event" button)
2. Taps "Create Event"
3. Fills form:
   - Name: "BBQ chez Alice"
   - Date: 2025-07-14 18:00
   - Location: "23 rue des Lilas" (optional)
   - Description: "Ramenez vos spécialités !" (optional)
4. Submits form
5. Event screen appears with share button
6. Taps share button → share sheet opens
7. Copies link or shares via WhatsApp

**Expected Results:**
- ✅ Event created in < 30s
- ✅ Share code is unique and short (6-8 chars)
- ✅ Link format: `https://app.popote.io/s/{shareCode}`
- ✅ Deep link works if app installed, web fallback otherwise
- ✅ Host sees empty event screen with category headers

**Test Cases:**
- **TC-UF1.1** — Happy path as described
- **TC-UF1.2** — Host shares link via SMS
- **TC-UF1.3** — Host shares link via WhatsApp
- **TC-UF1.4** — Host shares link via Email
- **TC-UF1.5** — Host adds first item immediately after creation

---

### UF-2: Guest Joins via Link and Adds Item

**Scenario:**
1. Guest receives link (e.g., via WhatsApp)
2. Taps link → app opens (or web if not installed)
3. Prompted to enter name: "Bob"
4. Sees event details and current items list (empty or populated)
5. Taps "+" floating button
6. Bottom sheet opens with form:
   - What: "Tiramisu maison"
   - Category: "🍰 Dessert"
   - Quantity: "pour 8 personnes" (optional)
7. Submits
8. Item appears in list under "Dessert" category
9. Guest sees their name next to the item

**Expected Results:**
- ✅ Join + add item in < 20s
- ✅ Name stored locally for future events
- ✅ Item appears instantly in guest's view
- ✅ Item syncs to other viewers in < 2s
- ✅ Guest can edit/delete their own items

**Test Cases:**
- **TC-UF2.1** — Happy path as described
- **TC-UF2.2** — Guest adds multiple items (different categories)
- **TC-UF2.3** — Guest edits their item after submission
- **TC-UF2.4** — Guest deletes their item after submission
- **TC-UF2.5** — Guest closes app and reopens, name is cached
- **TC-UF2.6** — Guest on web (not app) can still add items

---

### UF-3: Multiple Guests Adding Items Concurrently

**Scenario:**
1. Host creates event and shares link with 3 guests
2. All 4 users open event simultaneously
3. Each user adds 2 items in different categories
4. All users observe items appearing in real-time

**Expected Results:**
- ✅ No conflicts or duplicates
- ✅ All items appear in correct categories
- ✅ Each item shows correct contributor name
- ✅ No race conditions or lost updates
- ✅ Category view updates correctly as items added

**Test Cases:**
- **TC-UF3.1** — 4 users, each adds 2 items, sequential
- **TC-UF3.2** — 4 users, all add items within 5 seconds (stress test)
- **TC-UF3.3** — 10 users, each adds 1 item (scale test)
- **TC-UF3.4** — 2 users add item with same name (allowed, not deduplicated)

---

### UF-4: Category and Person View Switching

**Scenario:**
1. Event has 8 items across 4 categories, from 3 contributors
2. Default view: "By Category"
   - 🥂 Apéro: "Chips" (Alice), "Houmous" (Bob)
   - 🍖 Plat: "Poulet mariné" (Alice), "Salade de riz" (Charlie)
   - 🍰 Dessert: "Tiramisu" (Bob)
   - 🍷 Boissons: "Vin rouge" (Alice), "Jus d'orange" (Bob), "Eau" (Charlie)
3. User toggles to "By Person"
   - Alice: Chips, Poulet mariné, Vin rouge
   - Bob: Houmous, Tiramisu, Jus d'orange
   - Charlie: Salade de riz, Eau
4. User toggles back to "By Category"

**Expected Results:**
- ✅ Both views show same data, different organization
- ✅ Toggle is instant (no loading)
- ✅ View preference persists if user leaves and returns
- ✅ Empty categories are shown but collapsible

**Test Cases:**
- **TC-UF4.1** — Toggle between views multiple times
- **TC-UF4.2** — Add item while in "By Person" view (updates correctly)
- **TC-UF4.3** — Delete item while in "By Category" view (updates both views)
- **TC-UF4.4** — Event with only 1 category populated (others remain empty)
- **TC-UF4.5** — Event with all categories populated

---

### UF-5: Host Moderation (Edit/Delete Any Item)

**Scenario:**
1. Host creates event
2. Guest A adds "Salade" in Entrée
3. Guest B adds "Tarte" in Dessert
4. Host views event and sees both items
5. Host long-presses Guest A's item → moderation menu
6. Host selects "Delete"
7. Item removed from all views
8. Guest A sees their item disappear

**Expected Results:**
- ✅ Host can delete any item (not just their own)
- ✅ Guests can only delete their own items
- ✅ Deletion syncs in < 2s to all viewers
- ✅ No orphaned data in backend

**Test Cases:**
- **TC-UF5.1** — Host deletes guest item
- **TC-UF5.2** — Host edits guest item (if allowed in v1)
- **TC-UF5.3** — Guest attempts to delete another guest's item (should fail)
- **TC-UF5.4** — Guest deletes own item (should succeed)

---

## 4. Edge Cases and Error Scenarios

### EC-1: Network and Connectivity

**Scenarios:**
- **EC-1.1** — User opens event, goes offline, tries to add item
  - Expected: Item queued locally, submitted when back online
  - Alt: Show "Offline" indicator, prevent submission
- **EC-1.2** — User adds item, network drops before confirmation
  - Expected: Retry mechanism or visible error
- **EC-1.3** — User views event, network drops, other users add items
  - Expected: Items sync when network returns (SSE reconnect)
- **EC-1.4** — User switches from WiFi to cellular mid-session
  - Expected: Seamless continuation, no data loss
- **EC-1.5** — PocketBase server unreachable (500 error)
  - Expected: User-friendly error message, retry option

**Test Cases:**
- Simulate airplane mode during various actions
- Use network throttling to test slow connections
- Kill PocketBase server mid-action

---

### EC-2: Invalid or Malformed Inputs

**Scenarios:**
- **EC-2.1** — Event name with 500+ characters
  - Expected: Truncated or validation error
- **EC-2.2** — Item name with emojis, special chars, accents
  - Expected: Accepted and displayed correctly
- **EC-2.3** — Event date in the past
  - Expected: Allowed (could be for tracking past events)
- **EC-2.4** — Event date far in future (year 2100)
  - Expected: Allowed or validation warning
- **EC-2.5** — Quantity field with HTML/SQL injection attempt
  - Expected: Sanitized or escaped (PocketBase should handle)
- **EC-2.6** — Guest name empty or only whitespace
  - Expected: Validation error, prompt to enter valid name

**Test Cases:**
- Boundary value analysis on all text fields
- SQL injection attempts in text fields
- XSS attempts in description/item names
- Unicode and RTL text (Arabic, Hebrew)

---

### EC-3: Share Link and Deep Linking

**Scenarios:**
- **EC-3.1** — User opens share link with invalid code (404)
  - Expected: "Event not found" error page
- **EC-3.2** — Share link opened on device without app
  - Expected: Web fallback or redirect to app store
- **EC-3.3** — Share link opened after event deleted
  - Expected: "Event no longer available" message
- **EC-3.4** — Share link copied and pasted incorrectly (truncated)
  - Expected: Invalid code error
- **EC-3.5** — User shares event, then creates another, links don't conflict
  - Expected: Each event has unique share code

**Test Cases:**
- Manual URL manipulation
- Deep link handling on iOS vs. Android
- Web fallback behavior on desktop browser
- Share sheet cancellation (should not break flow)

---

### EC-4: Concurrent Edits and Race Conditions

**Scenarios:**
- **EC-4.1** — Two users edit same item simultaneously
  - Expected: Last write wins (PocketBase default) or conflict resolution
- **EC-4.2** — User A deletes item while User B is editing it
  - Expected: User B's edit fails gracefully ("Item no longer exists")
- **EC-4.3** — Host deletes event while guests are viewing
  - Expected: Guests see "Event deleted by host" message
- **EC-4.4** — 10 users add items within 1 second
  - Expected: All items created, no lost data

**Test Cases:**
- Automated script simulating concurrent actions
- Multi-device manual testing
- PocketBase real-time subscription behavior under load

---

### EC-5: Category and Data Constraints

**Scenarios:**
- **EC-5.1** — Event has 50+ items in one category
  - Expected: Scrollable list, performance acceptable
- **EC-5.2** — Event has 0 items (brand new)
  - Expected: Empty state with helpful prompt ("Tap + to add first item")
- **EC-5.3** — All items in "Autre" category (edge case)
  - Expected: Displays correctly, other categories shown empty
- **EC-5.4** — Item name with 500+ characters
  - Expected: Truncated in list view, full text in detail/edit view
- **EC-5.5** — Category selection not chosen (user skips)
  - Expected: Default to "Autre" or validation error

**Test Cases:**
- Performance testing with 100+ items
- Empty state UX validation
- Category distribution edge cases

---

### EC-6: Device and Platform Variations

**Scenarios:**
- **EC-6.1** — iOS vs. Android behavior differences
  - Expected: Consistent UX (Flutter handles most platform differences)
- **EC-6.2** — Small screen (iPhone SE) vs. large screen (iPad)
  - Expected: Responsive layout, no clipping
- **EC-6.3** — Dark mode vs. light mode (if implemented)
  - Expected: Readable text, correct theme colors
- **EC-6.4** — Accessibility: VoiceOver/TalkBack enabled
  - Expected: All interactive elements labeled and navigable
- **EC-6.5** — Older device (iOS 13, Android 9)
  - Expected: App runs or shows "minimum version" message
- **EC-6.6** — Web fallback on desktop browser
  - Expected: Usable but may lack some native features (share sheet)

**Test Cases:**
- Cross-platform testing (iOS, Android, web)
- Accessibility audit with screen readers
- Performance testing on low-end devices
- Browser compatibility (Chrome, Safari, Firefox)

---

## 5. Performance Benchmarks

### PB-1: Event Creation
- **Metric:** Time from "Create Event" tap to share link visible
- **Target:** < 30 seconds (95th percentile)
- **Test:** 100 event creations, measure each
- **Factors:** Network latency, form validation, backend response

### PB-2: Join + Add Item
- **Metric:** Time from link open to item visible in list
- **Target:** < 20 seconds (95th percentile)
- **Test:** 100 join+add flows, measure each
- **Factors:** Deep link resolution, name entry, item submission

### PB-3: Real-Time Sync
- **Metric:** Time from item submitted by User A to visible in User B's view
- **Target:** < 2 seconds (99th percentile)
- **Test:** 1000 item additions with 2+ concurrent viewers
- **Factors:** PocketBase SSE latency, network conditions

### PB-4: App Launch
- **Metric:** Time from app icon tap to home screen interactive
- **Target:** < 3 seconds (cold start, 90th percentile)
- **Test:** 50 cold starts, 50 warm starts
- **Factors:** Flutter initialization, local data load

### PB-5: Event List Load
- **Metric:** Time to load home screen with 20 past events
- **Target:** < 2 seconds
- **Test:** Populate local data with 20 events, measure load time
- **Factors:** Local database query, UI rendering

---

## 6. Test Environments

### ENV-1: Development
- **Backend:** PocketBase local instance (localhost:8090)
- **Frontend:** Flutter debug mode on emulator/simulator
- **Purpose:** Rapid iteration, detailed logs

### ENV-2: Staging
- **Backend:** PocketBase on PocketHost.io (staging subdomain)
- **Frontend:** Flutter profile/release mode on physical devices
- **Purpose:** Pre-production validation, realistic network conditions

### ENV-3: Production
- **Backend:** PocketBase on PocketHost.io (production subdomain)
- **Frontend:** App store builds (TestFlight, Play Console beta)
- **Purpose:** Final validation before public release

---

## 7. Test Execution Schedule

### Phase 1: Core Flows (Week 1)
- UF-1: Host creates and shares event
- UF-2: Guest joins and adds item
- SC-1, SC-2, SC-3: Validate success criteria

### Phase 2: Real-Time and Concurrency (Week 2)
- UF-3: Multiple guests concurrent actions
- SC-4: Real-time sync validation
- EC-4: Race conditions and conflicts

### Phase 3: Edge Cases (Week 3)
- EC-1: Network scenarios
- EC-2: Invalid inputs
- EC-3: Share link edge cases
- EC-5: Category and data constraints

### Phase 4: Performance (Week 4)
- PB-1 through PB-5: All performance benchmarks
- Load testing with 50+ concurrent users
- Stress testing with 500+ items in one event

### Phase 5: Cross-Platform (Week 5)
- EC-6: iOS, Android, web validation
- Accessibility testing
- Device compatibility matrix

---

## 8. Test Data

### Minimum Test Data
- 3 events: one past, one today, one future
- 5 participants per event
- 15 items per event across all categories
- Mix of optional fields (some with location, some without)

### Stress Test Data
- 1 event with 100+ items
- 1 event with 50+ participants
- 1 event with very long names/descriptions

### Edge Case Data
- Event with only 1 item
- Event with all items in "Autre"
- Event with no participants (just host)
- Items with special characters: emoji, accents, CJK characters

---

## 9. Acceptance Criteria Summary

An implementation is **ACCEPTED** if:
- ✅ All success criteria (SC-1 through SC-4) are met
- ✅ All user flows (UF-1 through UF-5) pass without critical bugs
- ✅ No critical edge cases cause crashes or data loss
- ✅ Performance benchmarks are within target ranges
- ✅ Cross-platform behavior is consistent (iOS/Android)

An implementation is **REJECTED** if:
- ❌ Any success criterion fails (e.g., creation takes > 30s)
- ❌ Data loss occurs in any scenario
- ❌ Real-time sync fails or is inconsistent
- ❌ Critical accessibility issues (screen reader unusable)
- ❌ Security issues (e.g., one guest can delete others' items)

---

## 10. Risk Assessment

### High Risk
- **Real-time sync reliability:** PocketBase SSE must be rock-solid (network drops, reconnects)
- **Concurrent edit conflicts:** Last-write-wins may cause user frustration
- **Share link security:** Unique codes must be unguessable (use UUIDs, not sequential IDs)

### Medium Risk
- **Offline behavior:** Users may expect offline-first (requires additional work)
- **Cross-platform consistency:** Flutter should handle, but deep linking can vary
- **Performance on low-end devices:** Flutter release mode should be tested on older hardware

### Low Risk
- **Category selection:** Fixed list reduces complexity
- **No authentication:** Fewer edge cases than login flows
- **Simple data model:** Three collections, straightforward relations

---

## 11. Test Automation Strategy

### Automated Tests (Unit + Integration)
- **Unit:** Riverpod state management, data models, validation logic
- **Widget:** Individual Flutter screens, forms, toggles
- **Integration:** End-to-end flows (creation → share → join → add item)

### Manual Tests
- Real-time sync across devices (requires multiple physical devices)
- Share link behavior (SMS, WhatsApp, email clients)
- Accessibility with actual screen readers
- Performance benchmarks (timed manually or with profiling tools)

### Tools
- **Flutter:** `flutter test`, `integration_test` package
- **PocketBase:** REST API tests with Postman/Newman or `curl`
- **CI/CD:** GitHub Actions to run automated tests on every commit

---

## 12. Notes for Developers

### Dallas (Backend)
- Ensure PocketBase SSE subscriptions handle reconnects gracefully
- Validate share codes are cryptographically random (not sequential)
- Test API rate limits to prevent abuse
- Provide clear error messages for all failure scenarios

### Kane (Mobile)
- Implement offline queueing or clear "offline" indicators
- Validate all user inputs before submission
- Handle deep link edge cases (invalid codes, app not installed)
- Optimize list rendering for 100+ items (use ListView.builder)

### Lambert (Testing)
- Automate happy paths (UF-1, UF-2) with integration tests
- Manual testing for real-time sync (requires 2+ devices)
- Document any test blockers or environment issues
- Track performance metrics in a spreadsheet for trend analysis

---

## 13. Revision History

| Version | Date       | Author  | Changes                          |
|---------|------------|---------|----------------------------------|
| 1.0     | 2025-03-22 | Lambert | Initial test plan based on PRD v1 |

