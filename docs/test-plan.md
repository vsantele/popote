# Test Plan — SvelteKit + Drizzle + Postgres

**Project:** popote  
**Stack:** SvelteKit (frontend), Drizzle ORM, PostgreSQL (backend)  
**Test Lead:** Lambert  
**Last Updated:** 2026-03-23  
**Migration Status:** Flutter + PocketBase → SvelteKit + Drizzle

---

## Overview

This test plan defines the quality strategy for the Popote application migrated to **SvelteKit + Drizzle + Postgres**. The core product requirements remain unchanged (zero-friction collaborative meal planning with real-time sync), but the testing approach must adapt to the new web-first stack.

**Key Success Criteria:**
- Event creation: < 30 seconds
- Join + add item: < 20 seconds  
- Real-time sync: < 2 seconds
- Zero signup required at any point

---

## Test Pyramid for SvelteKit Stack

```
           ┌─────────────────┐
           │   E2E Tests     │  ← Playwright (critical user flows)
           │   (Minimal)     │
           └─────────────────┘
          ┌───────────────────┐
          │ Integration Tests │  ← API routes + DB (Vitest)
          │   (Moderate)      │
          └───────────────────┘
        ┌─────────────────────────┐
        │   Component Tests       │  ← Svelte Testing Library
        │   (Moderate)            │
        └─────────────────────────┘
      ┌───────────────────────────────┐
      │   Unit Tests                  │  ← Vitest (utilities, logic)
      │   (Heavy)                     │
      └───────────────────────────────┘
```

---

## 1. Unit Tests (Vitest)

**Scope:** Pure functions, utilities, validation logic, Drizzle query builders

**Tools:**
- **Vitest** — Fast unit test runner (Vite-native)
- **Drizzle-Kit** — For schema validation
- **Mock data generators** — For testing edge cases

**Coverage:**
1. **Validation Logic**
   - Share code generation (6-8 char alphanumeric, uniqueness)
   - Event name validation (max length, special chars)
   - Category validation (valid enum values)
   - Device ID generation and persistence
   - Date validation (event must be in future)

2. **Drizzle Queries**
   - Event creation with auto-generated share code
   - Participant joins (FK integrity)
   - Item creation (category constraints)
   - Cascade delete behavior (event → participants → items)
   - Query filters (by share code, by device ID)

3. **Utility Functions**
   - Date formatting (French locale)
   - Category badge rendering
   - Device ID localStorage handling
   - Share link generation (`https://popote.io/s/{code}`)

**Example Test:**
```typescript
// tests/unit/validation.test.ts
import { describe, it, expect } from 'vitest';
import { generateShareCode, validateEventName } from '$lib/utils/validation';

describe('Share Code Generation', () => {
  it('generates 6-character alphanumeric codes', () => {
    const code = generateShareCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateShareCode());
    }
    expect(codes.size).toBe(1000); // No collisions
  });
});
```

**Run Command:**
```bash
npm run test:unit
# or
vitest --run --reporter=verbose
```

---

## 2. Component Tests (Svelte Testing Library)

**Scope:** Individual Svelte components in isolation

**Tools:**
- **Vitest** — Test runner
- **@testing-library/svelte** — Component testing utilities
- **@testing-library/user-event** — User interaction simulation

**Coverage:**
1. **EventCard Component**
   - Displays event name, date, location
   - Shows participant count
   - Share button triggers share modal
   - Handles missing optional fields (location, description)

2. **ItemCard Component**
   - Displays item name, category, quantity
   - Shows participant name
   - Edit/delete buttons for owner only
   - Category badge renders correct color

3. **AddItemSheet Component**
   - Form validation (required fields)
   - Category selector works
   - Quantity input accepts numeric values
   - Submit button disabled when invalid
   - Cancel button clears form

4. **CategorySelector Component**
   - Displays all 7 categories
   - Visual selection state
   - Single selection enforced
   - Keyboard navigation (a11y)

5. **ParticipantList Component**
   - Lists all participants
   - Host indicator visible
   - Empty state when no participants
   - Real-time updates on new joins

**Example Test:**
```typescript
// tests/component/AddItemSheet.test.ts
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import AddItemSheet from '$lib/components/AddItemSheet.svelte';

describe('AddItemSheet', () => {
  it('disables submit when form is invalid', async () => {
    render(AddItemSheet, { eventId: '123' });
    
    const submitBtn = screen.getByRole('button', { name: /add item/i });
    expect(submitBtn).toBeDisabled();
    
    await fireEvent.input(screen.getByLabelText(/item name/i), {
      target: { value: 'Pizza' }
    });
    await fireEvent.click(screen.getByText('Plat'));
    
    expect(submitBtn).not.toBeDisabled();
  });
});
```

**Run Command:**
```bash
npm run test:component
# or
vitest --run --config vitest.config.component.ts
```

---

## 3. Integration Tests (API Routes + Database)

**Scope:** SvelteKit API routes (`+server.ts`), database operations, real-time sync

**Tools:**
- **Vitest** — Test runner
- **Drizzle-ORM** — Database queries
- **Testcontainers** (or Docker Compose) — Ephemeral Postgres instance
- **SuperTest** (optional) — HTTP assertions

**Coverage:**
1. **Event Creation Flow**
   - POST `/api/events` creates event
   - Share code auto-generated and unique
   - Host participant auto-created
   - Returns event ID and share code

2. **Join Event Flow**
   - GET `/api/events?share_code={code}` returns event
   - POST `/api/participants` adds participant
   - Participant linked to correct event
   - Device ID stored correctly

3. **Add Item Flow**
   - POST `/api/items` creates item
   - Item linked to event and participant
   - Category validation enforced
   - Returns created item with timestamp

4. **Real-time Sync**
   - WebSocket/SSE endpoint returns item updates
   - Multiple clients receive same event
   - Updates arrive within 2 seconds
   - Reconnection handles gracefully

5. **Database Integrity**
   - Cascade delete: event → participants + items
   - Foreign key constraints enforced
   - Unique constraints on share codes
   - Transaction rollback on errors

**Example Test:**
```typescript
// tests/integration/event-creation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEvent } from '$lib/server/events';
import { db } from '$lib/server/db';
import { events, participants } from '$lib/server/schema';

describe('Event Creation', () => {
  let testDb;

  beforeEach(async () => {
    testDb = await setupTestDatabase();
  });

  afterEach(async () => {
    await teardownTestDatabase(testDb);
  });

  it('creates event with auto-generated share code', async () => {
    const eventData = {
      name: 'Test Party',
      date: new Date('2026-12-25'),
      hostName: 'Alice',
      hostDeviceId: 'device123'
    };

    const event = await createEvent(eventData);

    expect(event.shareCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(event.name).toBe('Test Party');
    
    // Verify host participant created
    const hostParticipant = await db
      .select()
      .from(participants)
      .where(eq(participants.eventId, event.id))
      .where(eq(participants.isHost, true));
    
    expect(hostParticipant).toHaveLength(1);
    expect(hostParticipant[0].name).toBe('Alice');
  });

  it('enforces unique share codes', async () => {
    // Create first event
    await createEvent({ name: 'Event 1', hostDeviceId: 'device1' });
    
    // Attempt to create second with mock collision
    const mockCollision = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    
    const event2 = await createEvent({ name: 'Event 2', hostDeviceId: 'device2' });
    
    expect(event2.shareCode).toBeDefined();
    expect(event2.shareCode).not.toBe('AAAAAA'); // Retry logic works
  });
});
```

**Run Command:**
```bash
npm run test:integration
# or
vitest --run --config vitest.config.integration.ts
```

---

## 4. End-to-End Tests (Playwright)

**Scope:** Critical user flows in real browser environment

**Tools:**
- **Playwright** — Browser automation
- **Playwright Test** — Test runner with fixtures

**Coverage (Minimal, High-Value Only):**

### Test Suite 1: Host Creates Event
```gherkin
Given I am on the home page
When I click "Create Event"
And I fill in event details (name, date, location)
And I click "Create"
Then I see the event detail page
And I see a share link
And I see myself as host participant
```

### Test Suite 2: Guest Joins via Share Link
```gherkin
Given an event exists with share code "ABC123"
When I visit "https://popote.io/s/ABC123"
Then I am redirected to join page
When I enter my name "Bob"
And I click "Join"
Then I see the event detail page
And I see all existing items
And I can add my own items
```

### Test Suite 3: Real-time Sync (Multi-Tab)
```gherkin
Given I have 2 browser tabs open on the same event
When I add an item in tab 1
Then I see the item appear in tab 2 within 2 seconds
When I delete the item in tab 2
Then I see it disappear in tab 1 within 2 seconds
```

### Test Suite 4: Add Item Flow
```gherkin
Given I am on an event detail page
When I click "Add Item"
And I select category "Plat"
And I enter item name "Pizza"
And I enter quantity "2"
And I click "Add"
Then I see the item in the category list
And other participants see it in real-time
```

**Example Test:**
```typescript
// tests/e2e/event-creation.spec.ts
import { test, expect } from '@playwright/test';

test('host creates event and shares link', async ({ page }) => {
  await page.goto('/');
  
  await page.click('text=Create Event');
  await page.fill('[name="eventName"]', 'Summer BBQ');
  await page.fill('[name="eventDate"]', '2026-07-15');
  await page.fill('[name="location"]', 'Central Park');
  await page.fill('[name="hostName"]', 'Alice');
  await page.click('button:text("Create")');
  
  // Wait for redirect to event page
  await page.waitForURL(/\/events\/[a-z0-9-]+/);
  
  // Verify event details visible
  await expect(page.locator('h1')).toHaveText('Summer BBQ');
  await expect(page.locator('text=Alice')).toBeVisible();
  
  // Verify share link exists
  const shareLink = page.locator('[data-testid="share-link"]');
  await expect(shareLink).toBeVisible();
  const shareUrl = await shareLink.textContent();
  expect(shareUrl).toMatch(/https:\/\/popote\.io\/s\/[A-Z0-9]{6}/);
});
```

**Run Command:**
```bash
npm run test:e2e
# or
playwright test
```

---

## 5. Real-time Sync Testing Strategy

**Challenge:** Real-time sync is the highest-risk area in the SvelteKit stack migration.

### Approach A: WebSocket/SSE Testing (Automated)
- Use Playwright to open 2+ browser contexts
- Simulate concurrent actions (add/edit/delete)
- Assert updates arrive within 2s threshold
- Measure latency with `performance.now()`

**Example:**
```typescript
// tests/e2e/realtime-sync.spec.ts
import { test, expect } from '@playwright/test';

test('real-time sync between users', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();
  
  // Both users join same event
  await page1.goto('/events/test-event-id');
  await page2.goto('/events/test-event-id');
  
  // User 1 adds item
  await page1.click('text=Add Item');
  await page1.fill('[name="itemName"]', 'Pizza');
  await page1.click('text=Plat');
  
  const startTime = Date.now();
  await page1.click('button:text("Add")');
  
  // User 2 should see item appear
  await page2.waitForSelector('text=Pizza', { timeout: 2000 });
  const latency = Date.now() - startTime;
  
  expect(latency).toBeLessThan(2000); // Success criteria
});
```

### Approach B: Manual Multi-Device Testing
**Why:** Browser contexts don't fully replicate network conditions

**Process:**
1. Deploy to staging environment
2. Open event on 2 physical devices (desktop + mobile)
3. Perform actions on device 1, measure appearance time on device 2
4. Test scenarios:
   - Add item (< 2s)
   - Edit item (< 2s)
   - Delete item (< 2s)
   - Network interruption → reconnection
5. Log results in spreadsheet

**Manual Test Checklist:**
- [ ] Item added on device 1 appears on device 2 within 2s
- [ ] Item edited on device 1 updates on device 2 within 2s
- [ ] Item deleted on device 1 disappears on device 2 within 2s
- [ ] Network drop → reconnect → sync resumes
- [ ] 5+ concurrent users all see updates within 2s
- [ ] No duplicate items on race conditions

---

## 6. Database Testing (Drizzle Migrations)

**Scope:** Schema integrity, migrations, seed data

**Tools:**
- **Drizzle-Kit** — Migration generation and execution
- **Drizzle-ORM** — Query validation
- **pg-mem** (optional) — In-memory Postgres for fast tests

**Coverage:**
1. **Schema Validation**
   - All tables created correctly
   - Foreign keys configured
   - Indexes on performance-critical columns
   - Enum types for categories

2. **Migration Testing**
   - Migrations apply cleanly (no errors)
   - Rollback works (down migrations)
   - Data integrity preserved across migrations
   - No breaking changes

3. **Seed Data**
   - Sample events, participants, items
   - Valid test scenarios
   - Edge cases (empty event, max participants)

**Example:**
```typescript
// tests/db/migrations.test.ts
import { describe, it, expect } from 'vitest';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db';

describe('Database Migrations', () => {
  it('applies all migrations without errors', async () => {
    await expect(
      migrate(db, { migrationsFolder: './drizzle' })
    ).resolves.not.toThrow();
  });

  it('creates all required tables', async () => {
    const tables = await db.select().from(pg_catalog.pg_tables)
      .where(eq(pg_catalog.pg_tables.schemaname, 'public'));
    
    const tableNames = tables.map(t => t.tablename);
    expect(tableNames).toContain('events');
    expect(tableNames).toContain('participants');
    expect(tableNames).toContain('items');
  });
});
```

---

## 7. Performance Validation

**Success Criteria (From PRD):**
- Event creation: < 30 seconds
- Join + add item: < 20 seconds
- Real-time sync: < 2 seconds

### Automated Performance Tests
```typescript
// tests/performance/timing.test.ts
import { test, expect } from '@playwright/test';

test('event creation completes in under 30 seconds', async ({ page }) => {
  await page.goto('/');
  
  const startTime = Date.now();
  
  await page.click('text=Create Event');
  await page.fill('[name="eventName"]', 'Test Event');
  await page.fill('[name="eventDate"]', '2026-12-31');
  await page.fill('[name="hostName"]', 'Test User');
  await page.click('button:text("Create")');
  
  await page.waitForURL(/\/events\/[a-z0-9-]+/);
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(30000); // 30 seconds
});

test('join and add item completes in under 20 seconds', async ({ page }) => {
  const startTime = Date.now();
  
  await page.goto('/s/ABC123'); // Share code redirect
  await page.fill('[name="name"]', 'Guest User');
  await page.click('button:text("Join")');
  
  await page.click('text=Add Item');
  await page.fill('[name="itemName"]', 'Salad');
  await page.click('text=Entrée');
  await page.click('button:text("Add")');
  
  await page.waitForSelector('text=Salad');
  
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(20000); // 20 seconds
});
```

### Manual Performance Benchmarking
Use browser DevTools Performance tab or Lighthouse:
1. Record event creation flow
2. Measure Total Blocking Time (TBT)
3. Measure First Contentful Paint (FCP)
4. Measure Time to Interactive (TTI)

**Target Metrics:**
- FCP: < 1.8s
- TTI: < 3.9s
- TBT: < 200ms
- Cumulative Layout Shift (CLS): < 0.1

---

## 8. Testing Tools Setup

### Package Installation
```bash
npm install -D vitest @vitest/ui
npm install -D @testing-library/svelte @testing-library/user-event
npm install -D playwright @playwright/test
npm install -D drizzle-kit
```

### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/component/**/*.test.ts'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts']
  }
});
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Real-time tests must run sequentially
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI
  }
});
```

---

## 9. CI/CD Integration Strategy

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  unit-and-component:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:component

  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/popote_test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### Test Scripts (package.json)
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:component && npm run test:integration",
    "test:unit": "vitest run --reporter=verbose",
    "test:component": "vitest run --reporter=verbose",
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

## 10. Manual Test Scenarios

### Scenario 1: Multi-Device Real-time Sync
**Devices:** Desktop (Chrome) + Mobile (Safari)  
**Steps:**
1. Host creates event on desktop
2. Guest joins via share link on mobile
3. Host adds item → verify mobile sees it within 2s
4. Guest adds item → verify desktop sees it within 2s
5. Host deletes item → verify mobile reflects deletion within 2s

**Pass Criteria:**
- All updates appear within 2 seconds
- No duplicate items
- No stale data

### Scenario 2: PWA Installation & Offline Behavior
**Steps:**
1. Visit app on mobile browser
2. Install PWA via browser prompt
3. Open as standalone app
4. Enable airplane mode
5. Attempt to add item (should show error)
6. Disable airplane mode
7. Verify sync resumes

**Pass Criteria:**
- PWA installs correctly
- Offline state clearly communicated
- Sync resumes on reconnect

### Scenario 3: Share Link Distribution
**Steps:**
1. Host creates event
2. Copy share link
3. Send via WhatsApp to test device
4. Click link on receiving device
5. Verify redirect to join page

**Pass Criteria:**
- Link works in WhatsApp in-app browser
- Redirect works on all platforms
- Event details load correctly

### Scenario 4: Edge Case Testing
**Scenarios:**
- Event with 50+ participants (stress test)
- Event with 100+ items (UI performance)
- Special characters in names (Unicode, emoji)
- Extremely long event names (truncation)
- Invalid share codes (404 handling)
- Expired/deleted events (error messaging)

---

## 11. Test Execution Phases

### Phase 1: Foundation (Week 1)
**Focus:** Unit tests, Drizzle schema validation  
**Owner:** Lambert  
**Deliverables:**
- All utility functions have unit tests
- Drizzle schema migrations tested
- Validation logic covered

### Phase 2: Component Isolation (Week 2)
**Focus:** Component tests for UI elements  
**Owner:** Lambert (with Dallas for component setup)  
**Deliverables:**
- All Svelte components have tests
- Form validation tested
- UI state transitions covered

### Phase 3: Integration (Week 3)
**Focus:** API routes + database operations  
**Owner:** Lambert + Kane  
**Deliverables:**
- Event creation flow tested
- Join flow tested
- Real-time sync integration tests
- Database integrity tests

### Phase 4: E2E Critical Paths (Week 4)
**Focus:** Full user flows in real browsers  
**Owner:** Lambert  
**Deliverables:**
- Host creates event (E2E)
- Guest joins via share link (E2E)
- Add item flow (E2E)
- Real-time sync (multi-tab)

### Phase 5: Performance & Manual Validation (Week 5)
**Focus:** Performance benchmarks, multi-device testing  
**Owner:** Lambert + Victor (manual testing)  
**Deliverables:**
- Performance criteria validated (< 30s, < 20s, < 2s)
- Multi-device manual tests completed
- PWA installation tested
- Share link distribution tested

---

## 12. Quality Gates

### Definition of Done (DoD) for Features:
- [ ] Unit tests written and passing
- [ ] Component tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E test for critical path written and passing
- [ ] Performance criteria met (if applicable)
- [ ] Manual smoke test passed
- [ ] No regressions in existing tests
- [ ] Code review approved

### Release Criteria (MVP):
- [ ] All automated tests passing (unit + component + integration + E2E)
- [ ] Performance benchmarks met (< 30s, < 20s, < 2s)
- [ ] Manual multi-device testing completed
- [ ] Real-time sync validated on 3+ devices
- [ ] Share links work across platforms (iOS, Android, desktop)
- [ ] PWA installation tested
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Security audit passed (no exposed secrets, CSRF protection)

---

## 13. Known Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Real-time sync fails under load | Medium | High | Load testing with 50+ concurrent users |
| Database migrations break production | Low | High | Test migrations on staging, backup before deploy |
| Share links fail on specific platforms | Medium | Medium | Test on iOS Safari, Android Chrome, desktop browsers |
| Performance degrades with 100+ items | Medium | Medium | Performance testing with large datasets |
| WebSocket/SSE connection drops | High | Medium | Implement reconnection logic, test manually |

---

## 14. Test Data Management

### Seed Data for Development
```typescript
// seed.ts
import { db } from '$lib/server/db';
import { events, participants, items } from '$lib/server/schema';

export async function seedTestData() {
  const event = await db.insert(events).values({
    name: 'Test Summer Party',
    date: new Date('2026-07-15'),
    location: 'Central Park',
    hostName: 'Alice',
    hostDeviceId: 'test-device-123',
    shareCode: 'TEST01'
  }).returning();

  await db.insert(participants).values([
    { eventId: event[0].id, name: 'Alice', deviceId: 'test-device-123', isHost: true },
    { eventId: event[0].id, name: 'Bob', deviceId: 'test-device-456', isHost: false }
  ]);

  await db.insert(items).values([
    { eventId: event[0].id, participantId: 1, name: 'Pizza', category: 'plat', quantity: '2' },
    { eventId: event[0].id, participantId: 2, name: 'Wine', category: 'boissons', quantity: '1 bottle' }
  ]);
}
```

### Test Database Setup
```bash
# Create test database
createdb popote_test

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

---

## 15. Documentation & Reporting

### Test Reports
- **Unit/Component:** Vitest HTML reporter (`vitest --ui`)
- **E2E:** Playwright HTML reporter (auto-generated)
- **Coverage:** `vitest --coverage` (target: 80% line coverage)

### Bug Tracking
- Use GitHub Issues with labels: `bug`, `test-failure`, `performance`
- Link to test file and reproduction steps
- Include browser/device info for E2E failures

### Weekly Test Status
Report to team:
1. Tests added this week
2. Tests passing/failing
3. Coverage delta
4. Blockers/risks

---

## Appendix: Migration Checklist

### Migrating from Flutter + PocketBase to SvelteKit + Drizzle

**Testing Impact:**
- ✅ **Preserved:** Core user flows (create, join, add item)
- ✅ **Preserved:** Success criteria (< 30s, < 20s, < 2s)
- ⚠️ **Changed:** Real-time sync (PocketBase SSE → WebSocket/SSE in SvelteKit)
- ⚠️ **Changed:** Component testing (Flutter widget tests → Svelte Testing Library)
- ⚠️ **Changed:** Database testing (PocketBase migrations → Drizzle migrations)
- ⚠️ **Changed:** Device ID persistence (Flutter SharedPreferences → Browser localStorage)

**New Testing Requirements:**
- [ ] Test SSE/WebSocket reconnection logic
- [ ] Test browser localStorage for device ID
- [ ] Test Drizzle query builders
- [ ] Test SvelteKit API routes (`+server.ts`)
- [ ] Test PWA offline behavior
- [ ] Test cross-browser compatibility (Safari, Chrome, Firefox)

---

**Approved by:** Lambert (Tester)  
**Date:** 2026-03-23  
**Next Review:** After Phase 1 completion
