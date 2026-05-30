import { afterEach } from "vite-plus/test";
import { cleanup } from "@testing-library/svelte";
import "@testing-library/jest-dom";

// Unmount any components rendered with @testing-library/svelte after each test
// so state does not leak between tests. This is the officially recommended setup.
afterEach(() => {
  cleanup();
});

// NOTE: We intentionally do NOT mock `crypto.randomUUID`, `localStorage`, or
// `document.cookie`. The jsdom environment provides real `localStorage` and
// `document.cookie`, and Node 20+ provides `crypto.randomUUID` globally, so
// hand-rolled mocks would only hide bugs and diverge from real browser behavior.
