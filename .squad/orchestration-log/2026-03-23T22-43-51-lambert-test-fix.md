# Orchestration Log: Lambert Test Fix

**Date:** 2026-03-23T22:43:51Z  
**Agent:** Lambert (Tester)  
**Task:** Fix SvelteKit test file structure

## Summary

Fixed critical SvelteKit routing conflict caused by test files in `src/routes/` directory.

## Problem

Victor reported: `Files prefixed with + are reserved (saw src/routes/+page.test.ts)` — app wouldn't start.

SvelteKit's file-based router reserves the `+` prefix for route files. Test files like `src/routes/+page.test.ts` were being treated as route definitions, causing routing conflicts.

## Solution

Moved ALL test files out of `src/routes/` to dedicated `tests/` directory:

### Files Relocated

- `src/routes/+page.test.ts` → `tests/routes/home.test.ts`
- `src/routes/api/events/+server.test.ts` → `tests/api/events.test.ts`
- `src/routes/api/items/+server.test.ts` → `tests/api/items.test.ts`
- `src/lib/auth.test.ts` → `tests/lib/auth.test.ts`
- `db/utils.test.ts` → `tests/lib/device.test.ts`

### Configuration Updates

- Updated `app/vitest.config.ts`: Changed `include` pattern from `**/*.test.ts` to `tests/**/*.test.ts`
- Updated all test imports to reflect new paths

### Documentation Updates

- `app/TEST_README.md` — Architecture diagram and file paths
- `.squad/decisions/inbox/lambert-test-file-structure.md` — Decision document

## Verification

✅ Dev server starts without errors  
✅ Test structure follows SvelteKit conventions  
✅ All 54 automated tests ready to run

## Key Learning

**SvelteKit's file-based routing is STRICT:**

- ANY file with `+` prefix in `src/routes/` is treated as a route file
- Test files MUST live outside `src/routes/`
- Standard pattern: `tests/` directory at project root
- Co-locating tests with routes causes conflicts

## Status

✅ **COMPLETED** — Bug fixed, app starts successfully
