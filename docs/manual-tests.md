# Manual Test Scenarios for Popote

**Status:** Active  
**Last Updated:** 2026-03-23  
**Owner:** Lambert (Tester)

This document outlines manual test scenarios that cannot be fully automated due to real-world conditions (physical devices, network behavior, PWA installation).

---

## 🎯 Testing Prerequisites

Before running manual tests, ensure:
- [ ] Application deployed to staging environment
- [ ] Access to 2+ physical devices (desktop + mobile recommended)
- [ ] Test devices on different networks (Wi-Fi + cellular recommended)
- [ ] Chrome DevTools available for performance measurement

---

## ⏱️ Performance Validation

### Success Criteria (from PRD)
1. **Event creation:** < 30 seconds
2. **Join + add item:** < 20 seconds
3. **Real-time sync:** < 2 seconds

---

### Test 1: Event Creation Performance

**Goal:** Validate event creation completes within 30 seconds

**Steps:**
1. Open staging URL in Chrome
2. Open DevTools → Performance tab
3. Click "Create Event"
4. Start recording
5. Fill form:
   - Host name: "Test User"
   - Event name: "Performance Test Event"
   - Date: Tomorrow at 18:00
   - Location: "Test Location"
6. Click "Create"
7. Wait for redirect to event detail page
8. Stop recording

**Expected Results:**
- ✅ Total time from click to redirect: **< 30 seconds**
- ✅ No JavaScript errors in console
- ✅ Share code visible on event page

**Measure:**
- First Contentful Paint (FCP): < 1.8s
- Time to Interactive (TTI): < 3.9s
- Total Blocking Time (TBT): < 200ms

**Pass Criteria:** Event created in under 30 seconds ✅  
**Failure Criteria:** Event creation takes > 30 seconds ❌

---

### Test 2: Join + Add Item Performance

**Goal:** Validate guest can join and add item within 20 seconds

**Steps:**
1. Create event (use Test 1)
2. Copy share code
3. Open **incognito window** (simulates new user)
4. Start timer
5. Navigate to staging URL
6. Enter share code → Click "Join"
7. Fill participant name → Click "Join Event"
8. Click "Add Item"
9. Fill item details:
   - Name: "Pizza"
   - Category: "Plat"
10. Click "Add"
11. Stop timer when item appears in list

**Expected Results:**
- ✅ Total time from join to item visible: **< 20 seconds**
- ✅ Item appears in list immediately after submit

**Pass Criteria:** Join + add item < 20 seconds ✅  
**Failure Criteria:** Join + add item > 20 seconds ❌

---

## 🔄 Real-time Sync Validation

### Test 3: Multi-Device Real-Time Sync

**Goal:** Validate real-time sync latency < 2 seconds on physical devices

**Prerequisites:**
- Device 1: Desktop (Chrome)
- Device 2: Mobile (Safari or Chrome)
- Both devices on different networks (Wi-Fi vs cellular preferred)

**Steps:**
1. **Setup:**
   - Device 1: Create event, get share code
   - Device 2: Join event using share code

2. **Test Add Item:**
   - Device 1: Add item "Pizza" (category: Plat)
   - Start timer
   - Device 2: Observe when "Pizza" appears
   - Record latency

3. **Test Edit Item:**
   - Device 1: Edit "Pizza" → Change quantity to "2"
   - Start timer
   - Device 2: Observe when quantity updates
   - Record latency

4. **Test Delete Item:**
   - Device 1: Delete "Pizza"
   - Start timer
   - Device 2: Observe when "Pizza" disappears
   - Record latency

**Expected Results:**
- ✅ Add item latency: **< 2 seconds**
- ✅ Edit item latency: **< 2 seconds**
- ✅ Delete item latency: **< 2 seconds**
- ✅ No duplicate items appear
- ✅ No race condition issues

**Pass Criteria:** All operations sync < 2 seconds ✅  
**Failure Criteria:** Any operation > 2 seconds ❌

---

### Test 4: Concurrent User Sync (5+ Users)

**Goal:** Validate sync works with multiple concurrent users

**Prerequisites:**
- 5 physical devices or browser tabs (simulating different devices)
- All devices joined same event

**Steps:**
1. **Setup:** 5 users join same event
2. **Concurrent Adds:**
   - User 1: Add "Pizza"
   - User 2: Add "Salade"
   - User 3: Add "Vin Rouge"
   - User 4: Add "Gâteau"
   - User 5: Add "Chips"
3. **Observe:** All items appear on all devices
4. **Verify:**
   - No duplicate items
   - All 5 items visible on all devices
   - Latency < 2 seconds per item

**Expected Results:**
- ✅ All items appear on all devices
- ✅ No duplicates
- ✅ Latency < 2 seconds

**Pass Criteria:** All items sync correctly ✅  
**Failure Criteria:** Missing items or duplicates ❌

---

### Test 5: Network Interruption & Reconnection

**Goal:** Validate sync resumes after network drop

**Steps:**
1. **Setup:** 2 devices with same event open
2. **Disconnect:**
   - Device 1: Enable airplane mode (30 seconds)
   - Device 2: Add item "Pizza"
3. **Reconnect:**
   - Device 1: Disable airplane mode
   - Observe sync resume
4. **Verify:**
   - Device 1 shows "Pizza" after reconnection
   - No errors displayed

**Expected Results:**
- ✅ Sync resumes automatically after reconnection
- ✅ No data loss
- ✅ User sees reconnection indicator (if implemented)

**Pass Criteria:** Sync resumes after network restored ✅  
**Failure Criteria:** Data lost or errors shown ❌

---

## 📱 PWA Installation

### Test 6: PWA Installation (Mobile)

**Goal:** Validate PWA can be installed on mobile devices

**Devices:**
- iOS Safari (iPhone/iPad)
- Android Chrome

**Steps (iOS Safari):**
1. Open staging URL in Safari
2. Tap Share button → "Add to Home Screen"
3. Confirm installation
4. Open app from home screen
5. Create event
6. Verify app works like native app (no browser chrome)

**Steps (Android Chrome):**
1. Open staging URL in Chrome
2. Wait for "Install" prompt or tap ⋮ → "Install app"
3. Confirm installation
4. Open app from home screen
5. Create event
6. Verify full-screen experience

**Expected Results:**
- ✅ Install prompt appears
- ✅ App icon added to home screen
- ✅ App runs in standalone mode (no browser UI)
- ✅ All features work as in browser

**Pass Criteria:** PWA installs and runs standalone ✅  
**Failure Criteria:** Installation fails or app shows browser chrome ❌

---

### Test 7: PWA Offline Behavior

**Goal:** Validate offline experience (if implemented)

**Steps:**
1. Install PWA (Test 6)
2. Open event detail page
3. Enable airplane mode
4. Refresh app
5. Attempt to view cached event data
6. Disable airplane mode
7. Verify sync resumes

**Expected Results:**
- ✅ Cached data visible offline (if caching implemented)
- ✅ Offline indicator shown
- ✅ Sync resumes when online

**Note:** If offline support not implemented, this test validates error handling.

**Pass Criteria:** Offline behavior is clear ✅  
**Failure Criteria:** Confusing error or app crash ❌

---

## 🔗 Share Link Distribution

### Test 8: Share Link via Messaging Apps

**Goal:** Validate share links work across messaging platforms

**Platforms to Test:**
- WhatsApp
- SMS
- Email
- Slack/Discord

**Steps:**
1. Create event → Copy share code
2. Send link via messaging app: `https://popote.io/e/ABC123`
3. Recipient opens link
4. Verify redirect to event detail page

**Expected Results:**
- ✅ Link opens in browser (or PWA if installed)
- ✅ Event detail page loads correctly
- ✅ Join button visible

**Pass Criteria:** Links work across all platforms ✅  
**Failure Criteria:** Link broken or redirects fail ❌

---

### Test 9: Share Code Copy/Paste UX

**Goal:** Validate copy/paste flow is smooth

**Steps:**
1. Create event
2. Click "Copy Share Code" button
3. Verify copied to clipboard
4. Open incognito window
5. Paste code into "Join Event" field
6. Verify uppercase normalization (e.g., "abc123" → "ABC123")

**Expected Results:**
- ✅ Copy button works
- ✅ Toast notification shows "Copied!"
- ✅ Paste works in join field
- ✅ Case-insensitive matching

**Pass Criteria:** Copy/paste flow is intuitive ✅  
**Failure Criteria:** Copy fails or paste requires manual formatting ❌

---

## 🌐 Cross-Browser Validation

### Test 10: Browser Compatibility

**Goal:** Validate app works across major browsers

**Browsers to Test:**
- Chrome (desktop + mobile)
- Safari (desktop + mobile)
- Firefox (desktop)
- Edge (desktop)

**Test Scenarios:**
1. Create event
2. Join event via share code
3. Add/edit/delete items
4. Real-time sync (2 tabs in same browser)

**Expected Results:**
- ✅ All features work in all browsers
- ✅ UI renders correctly
- ✅ No console errors

**Known Issues:**
- Safari < 15.4: CSS `gap` property issues (acceptable)
- Firefox: Potential service worker issues (investigate if found)

**Pass Criteria:** Core features work in all browsers ✅  
**Failure Criteria:** Critical feature broken in major browser ❌

---

## ♿ Accessibility Validation

### Test 11: Screen Reader Compatibility

**Goal:** Validate app is usable with screen readers

**Tools:**
- VoiceOver (iOS/macOS)
- TalkBack (Android)
- NVDA (Windows)

**Steps:**
1. Enable screen reader
2. Navigate to create event page
3. Verify labels are read correctly
4. Fill form using keyboard only
5. Submit form
6. Navigate to event detail page
7. Add item using keyboard only

**Expected Results:**
- ✅ All form labels read correctly
- ✅ Focus indicators visible
- ✅ Keyboard navigation works (Tab, Enter, Esc)
- ✅ Error messages announced

**Pass Criteria:** App is usable with screen reader ✅  
**Failure Criteria:** Key features inaccessible ❌

---

### Test 12: Keyboard-Only Navigation

**Goal:** Validate app is usable without mouse

**Steps:**
1. Open homepage
2. Tab through all interactive elements
3. Create event using only keyboard:
   - Tab to fields
   - Enter to submit
4. Navigate to event detail
5. Add item using only keyboard

**Expected Results:**
- ✅ All interactive elements focusable
- ✅ Focus order logical
- ✅ Modals closable with Esc
- ✅ Forms submittable with Enter

**Pass Criteria:** Full app usable with keyboard ✅  
**Failure Criteria:** Key actions require mouse ❌

---

## 📊 Test Results Tracking

| Test ID | Test Name | Status | Latency (if applicable) | Notes |
|---------|-----------|--------|-------------------------|-------|
| Test 1  | Event Creation Performance | ⏳ Pending | - | - |
| Test 2  | Join + Add Item Performance | ⏳ Pending | - | - |
| Test 3  | Multi-Device Sync | ⏳ Pending | - | - |
| Test 4  | Concurrent User Sync | ⏳ Pending | - | - |
| Test 5  | Network Interruption | ⏳ Pending | - | - |
| Test 6  | PWA Installation | ⏳ Pending | - | - |
| Test 7  | PWA Offline | ⏳ Pending | - | - |
| Test 8  | Share Link Distribution | ⏳ Pending | - | - |
| Test 9  | Share Code Copy/Paste | ⏳ Pending | - | - |
| Test 10 | Browser Compatibility | ⏳ Pending | - | - |
| Test 11 | Screen Reader | ⏳ Pending | - | - |
| Test 12 | Keyboard Navigation | ⏳ Pending | - | - |

**Legend:**
- ⏳ Pending: Not tested yet
- ✅ Pass: Test passed
- ❌ Fail: Test failed
- ⚠️ Partial: Test passed with caveats

---

## 🚀 Pre-Release Checklist

Before each release, complete:
- [ ] All performance tests pass (< 30s, < 20s, < 2s)
- [ ] Real-time sync validated on physical devices
- [ ] PWA installation tested on iOS + Android
- [ ] Share links work across messaging apps
- [ ] Accessibility validated with screen reader
- [ ] Cross-browser compatibility verified

---

## 📝 Notes for Victor

**Questions:**
1. **Real-time sync approach:** What technology are we using? (WebSocket, SSE, polling, or third-party service like Supabase Realtime?)
2. **Offline support:** Is PWA offline caching a hard requirement, or can we defer to Phase 2?
3. **Browser support:** Do we need to support IE11 or older Safari versions?
4. **Performance budget:** Are the success criteria non-negotiable, or is there tolerance (e.g., 3s sync)?

---

**Manual Test Scenarios Documented by:** Lambert (Tester)  
**Date:** 2026-03-23  
**Status:** Ready for execution
