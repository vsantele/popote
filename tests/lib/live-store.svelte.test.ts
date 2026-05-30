import { describe, it, expect, vi } from "vite-plus/test";
import { flushSync } from "svelte";
import {
  LiveStore,
  type LiveSource,
} from "../../src/lib/realtime/live-store.svelte";

/**
 * A controllable fake SSE source so we can drive the LiveStore state machine
 * deterministically — no real EventSource / server required. The real DO/SSE
 * fanout path can only be exercised against a deployed void.cloud environment;
 * here we test the reconnection + fallback reducer in isolation.
 */
function makeFakeSource() {
  const handlers = new Map<string, Array<(e: { data: unknown }) => void>>();
  let errorHandler: ((e: Event) => void) | null = null;
  let closed = false;

  const source: LiveSource = {
    on(event, handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return () => {};
    },
    onError(handler) {
      errorHandler = handler;
      return () => {};
    },
    close() {
      closed = true;
    },
  };

  return {
    source,
    get closed() {
      return closed;
    },
    emit(event: string, data: unknown = "") {
      for (const h of handlers.get(event) ?? []) h({ data });
    },
    emitError() {
      errorHandler?.(new Event("error"));
    },
  };
}

/**
 * Synchronous fake timer registry so backoff/poll scheduling is deterministic.
 */
function makeFakeTimers() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    setTimer: (cb: () => void, _ms: number) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    clearTimer: (id: number) => {
      pending.delete(id);
    },
    /** Run the most recently scheduled timer (LIFO is fine for these tests). */
    runLast() {
      const ids = [...pending.keys()];
      const id = ids[ids.length - 1];
      const cb = pending.get(id);
      pending.delete(id);
      cb?.();
    },
    get size() {
      return pending.size;
    },
  };
}

describe("LiveStore connection state machine", () => {
  it("starts in 'connecting' and moves to 'connected' on open", () => {
    const fake = makeFakeSource();
    const onChange = vi.fn();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange,
    });

    store.start();
    expect(store.status).toBe("connecting");

    fake.emit("open");
    expect(store.status).toBe("connected");
    // The first connect does NOT reconcile (the page already loaded fresh
    // data); reconciling here would cause an invalidate→reconnect loop.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("calls onChange when the server emits a 'change' event", () => {
    const fake = makeFakeSource();
    const onChange = vi.fn();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange,
    });

    store.start();
    fake.emit("open"); // no reconcile on first connect
    fake.emit("change", "tok-2"); // 1
    fake.emit("change", "tok-3"); // 2

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("reconnects with backoff after an error, then recovers on open", () => {
    const fake = makeFakeSource();
    const timers = makeFakeTimers();
    const onChange = vi.fn();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    store.start();
    fake.emit("open");
    expect(store.status).toBe("connected");
    expect(onChange).not.toHaveBeenCalled(); // first connect: no reconcile

    fake.emitError();
    expect(store.status).toBe("reconnecting");
    expect(fake.closed).toBe(true); // old source torn down
    expect(timers.size).toBe(1); // a reconnect was scheduled

    timers.runLast(); // fire the backoff timer -> reopen
    fake.emit("open");
    expect(store.status).toBe("connected");
    // A genuine *re*connect reconciles in case updates were missed while down.
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("drops to 'fallback' polling after repeated failures", () => {
    const fake = makeFakeSource();
    const timers = makeFakeTimers();
    const onChange = vi.fn();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
      maxReconnectAttempts: 3,
      fallbackPollMs: 5000,
    });

    store.start();
    // attempt 1 + 2 schedule reconnects; attempt 3 enters fallback
    fake.emitError();
    expect(store.status).toBe("reconnecting");
    timers.runLast();
    fake.emitError();
    expect(store.status).toBe("reconnecting");
    timers.runLast();
    fake.emitError();

    expect(store.status).toBe("fallback");

    // Fallback polls via onChange on its interval.
    const before = onChange.mock.calls.length;
    timers.runLast(); // first poll tick
    expect(onChange.mock.calls.length).toBe(before + 1);
  });

  it("treats a transport that never opens as a failure (open timeout)", () => {
    const fake = makeFakeSource();
    const timers = makeFakeTimers();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange: vi.fn(),
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
      openTimeoutMs: 5000,
    });

    store.start();
    expect(store.status).toBe("connecting");
    // The transport sits in CONNECTING — no open, no error. Fire the open
    // timeout (the only pending timer) and we should advance to reconnecting.
    expect(timers.size).toBe(1);
    timers.runLast();
    expect(store.status).toBe("reconnecting");
    expect(fake.closed).toBe(true);
  });

  it("stop() tears down the source and cancels timers", () => {
    const fake = makeFakeSource();
    const timers = makeFakeTimers();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange: vi.fn(),
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    store.start();
    fake.emitError(); // schedules a reconnect timer
    expect(timers.size).toBe(1);

    store.stop();
    expect(fake.closed).toBe(true);
    expect(timers.size).toBe(0);
  });

  it("status is reactive ($state)", () => {
    const fake = makeFakeSource();
    const store = new LiveStore({
      url: "/e/ABC/live",
      openSource: () => fake.source,
      onChange: vi.fn(),
    });

    const seen: string[] = [];
    const cleanup = $effect.root(() => {
      $effect(() => {
        seen.push(store.status);
      });
    });

    store.start();
    flushSync();
    fake.emit("open");
    flushSync();

    expect(seen).toContain("connected");
    cleanup();
  });
});
