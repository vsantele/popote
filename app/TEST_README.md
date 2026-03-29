# Test Suite for Popote

**Status:** Implemented  
**Coverage Target:** 80%  
**Test Framework:** Vitest + Testing Library  
**Last Updated:** 2026-03-23

This directory contains automated tests for the Popote application, following the test strategy defined in `.squad/decisions/inbox/lambert-test-strategy.md`.

---

## 🏗️ Test Architecture

```
app/
├── tests/                           # All test files (outside src/routes/)
│   ├── lib/
│   │   ├── auth.test.ts            # Device ID generation & persistence
│   │   └── device.test.ts          # Share code generation tests
│   ├── routes/
│   │   └── home.test.ts            # Home page component tests
│   └── api/
│       ├── events.test.ts          # Event creation API tests
│       └── items.test.ts           # Item CRUD API tests
├── src/
│   ├── lib/
│   │   └── test/
│   │       ├── setup.ts            # Global test setup (mocks, cleanup)
│   │       └── mockData.ts         # Mock data for tests
│   └── routes/                     # NO test files here (SvelteKit routing conflict)
├── vitest.config.ts                # Vitest configuration
└── package.json                    # Test scripts
```

**IMPORTANT:** Test files MUST NOT be placed in `src/routes/` with `+` prefix, as this conflicts with SvelteKit's file-based router. All tests are in the `tests/` directory.

---

## 🧪 Test Types

### 1. Unit Tests (40% of coverage)

**Location:** `tests/lib/**/*.test.ts`

**What's Tested:**

- Device ID generation and persistence (`tests/lib/auth.test.ts`)
- Share code generation and validation (`tests/lib/device.test.ts`)
- Utility functions
- Business logic

**Run:** `pnpm test` or `pnpm test:run`

---

### 2. Component Tests (30% of coverage)

**Location:** `tests/routes/**/*.test.ts`

**What's Tested:**

- Svelte component rendering
- User interaction (forms, buttons)
- Props and state management
- Accessibility (ARIA labels, keyboard navigation)

**Tools:** Vitest + @testing-library/svelte

**Run:** `pnpm test` (same as unit tests)

---

### 3. Integration Tests (25% of coverage)

**Location:** `tests/api/**/*.test.ts`

**What's Tested:**

- API route handlers (`+server.ts`)
- Database operations (mocked)
- Request validation
- Error handling
- Authorization logic

**Run:** `pnpm test` (same as unit tests)

**Note:** Database is mocked. For full integration tests with real Postgres, see `docs/manual-tests.md`.

---

### 4. Manual Tests (5% of effort)

**Location:** `docs/manual-tests.md`

**What's Tested:**

- Real-time sync on physical devices
- PWA installation (iOS + Android)
- Share link distribution (WhatsApp, SMS, email)
- Cross-browser compatibility
- Accessibility (screen readers, keyboard navigation)
- Performance benchmarks (< 30s, < 20s, < 2s)

**Run:** Follow instructions in `docs/manual-tests.md`

---

## 🚀 Running Tests

### Run All Tests (Watch Mode)

```bash
pnpm test
```

### Run Tests Once (CI Mode)

```bash
pnpm test:run
```

### Run with UI (Browser Interface)

```bash
pnpm test:ui
```

### Run with Coverage Report

```bash
pnpm test:coverage
```

Coverage report will be generated in `coverage/` directory.

---

## 📊 Test Coverage Goals

| Type              | Target   | Rationale                              |
| ----------------- | -------- | -------------------------------------- |
| Unit Tests        | 90%+     | Core logic should be fully covered     |
| Component Tests   | 70%+     | UI components should be mostly covered |
| Integration Tests | 80%+     | API routes should be well tested       |
| Overall           | **80%+** | Good balance of confidence vs effort   |

---

## ✅ What's Covered

### ✅ Unit Tests

- [x] Device ID generation (`tests/lib/auth.test.ts`)
- [x] Device ID persistence to localStorage
- [x] Device ID sync to cookie
- [x] Share code generation (`tests/lib/device.test.ts`)
- [x] Share code validation
- [x] Share code collision resistance
- [x] Share code uniqueness checks

### ✅ Component Tests

- [x] Home page rendering (`tests/routes/home.test.ts`)
- [x] Create event button
- [x] Join event form
- [x] Share code input validation
- [ ] Create event form (TODO)
- [ ] Event detail component (TODO)
- [ ] Item list component (TODO)

### ✅ Integration Tests

- [x] POST /api/events - Event creation (`tests/api/events.test.ts`)
- [x] Event creation validation
- [x] Host participant auto-creation
- [x] POST /api/items - Item creation (`tests/api/items.test.ts`)
- [x] Item category validation
- [x] Participant authorization
- [ ] GET /api/events/[code] - Event retrieval (TODO)
- [ ] DELETE /api/items/[id] - Item deletion (TODO)

### ⏳ Manual Tests

- [ ] Real-time sync validation (< 2s)
- [ ] PWA installation (iOS + Android)
- [ ] Share link distribution
- [ ] Performance benchmarks
- [ ] Cross-browser compatibility
- [ ] Accessibility validation

---

## 🛠️ Test Utilities

### Mock Data

**File:** `src/lib/test/mockData.ts`

Provides realistic test data:

- `mockDeviceId` - Sample device ID
- `mockEvent` - Sample event object
- `mockParticipant` - Sample participant object
- `mockItem` - Sample item object
- `mockCategories` - Valid item categories

**Usage:**

```typescript
import { mockEvent, mockParticipant } from "$lib/test/mockData"

test("should display event name", () => {
  render(EventCard, { event: mockEvent })
  expect(screen.getByText(mockEvent.name)).toBeInTheDocument()
})
```

---

### Global Setup

**File:** `src/lib/test/setup.ts`

Provides:

- Automatic cleanup after each test
- Mock `crypto.randomUUID()` for stable UUIDs
- Mock `localStorage` for browser storage
- Mock `document.cookie` for cookie storage
- Jest DOM matchers (`toBeInTheDocument`, etc.)

---

## 🐛 Debugging Tests

### Run Single Test File

```bash
pnpm test tests/lib/auth.test.ts
```

### Run Tests Matching Pattern

```bash
pnpm test -t "Device ID"
```

### Run Tests in Specific Directory

```bash
pnpm test tests/api
```

### Enable Verbose Output

```bash
pnpm test --reporter=verbose
```

---

## 🚨 Common Issues

### Issue 1: "localStorage is not defined"

**Cause:** Test running in Node environment without browser mocks

**Solution:** Ensure `vitest.config.ts` has `environment: 'jsdom'` and `setupFiles` includes `setup.ts`.

---

### Issue 2: "Cannot find module '$lib/...'"

**Cause:** Path alias not resolved in Vitest

**Solution:** Check `vitest.config.ts` has `resolve.alias` configured:

```typescript
resolve: {
  alias: {
    $lib: resolve('./src/lib'),
    $app: resolve('./node_modules/@sveltejs/kit/src/runtime/app'),
  },
}
```

---

### Issue 3: "TypeError: Cannot read property '...' of undefined"

**Cause:** Missing mock for SvelteKit module (`$app/navigation`, `$app/environment`)

**Solution:** Add mock in test file:

```typescript
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}))
```

---

### Issue 4: Tests timeout when database is not available

**Cause:** Integration tests trying to connect to real database

**Solution:** Ensure database is mocked in tests:

```typescript
vi.mock("$lib/server/db", () => ({
  getDb: vi.fn(),
}))
```

---

## 📚 Best Practices

### 1. Test Naming

```typescript
// ❌ Bad
test('should work', () => { ... });

// ✅ Good
test('should generate UUID v4 device ID when none exists', () => { ... });
```

### 2. Arrange-Act-Assert Pattern

```typescript
test("should add item to event", () => {
  // Arrange: Setup test data
  const event = mockEvent

  // Act: Perform action
  const result = addItemToEvent(event, mockItem)

  // Assert: Verify result
  expect(result.items).toHaveLength(1)
})
```

### 3. Test One Thing

```typescript
// ❌ Bad: Testing multiple things
test('should handle user flow', () => {
  expect(createEvent()).toBeDefined();
  expect(joinEvent()).toBeTruthy();
  expect(addItem()).toHaveLength(1);
});

// ✅ Good: Separate tests
test('should create event', () => { ... });
test('should join event', () => { ... });
test('should add item', () => { ... });
```

### 4. Mock External Dependencies

```typescript
// ✅ Mock database
vi.mock("$lib/server/db", () => ({ getDb: vi.fn() }))

// ✅ Mock navigation
vi.mock("$app/navigation", () => ({ goto: vi.fn() }))

// ✅ Mock fetch
global.fetch = vi.fn(() => Promise.resolve({ json: () => mockData }))
```

---

## 🔄 CI/CD Integration

Tests run automatically on:

- Every commit to `main` or `develop`
- Every pull request

**GitHub Actions Workflow:** `.github/workflows/test.yml` (if configured)

**Quality Gate:**

- All tests must pass ✅
- Coverage must be ≥ 80% ✅
- No linting errors ✅

---

## 📝 TODO: Future Improvements

- [ ] Add component tests for create event form
- [ ] Add component tests for event detail page
- [ ] Add component tests for item list
- [ ] Add E2E tests with Playwright (critical paths only)
- [ ] Setup CI/CD with GitHub Actions
- [ ] Add visual regression testing (Chromatic or Percy)
- [ ] Add performance testing (Lighthouse CI)

---

## 📖 References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
- [Test Strategy Document](../.squad/decisions/inbox/lambert-test-strategy.md)
- [Manual Test Scenarios](../docs/manual-tests.md)

---

**Test Suite Implemented by:** Lambert (Tester)  
**Date:** 2026-03-23  
**Status:** Ready for execution
