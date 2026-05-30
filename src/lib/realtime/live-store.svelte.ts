/**
 * Client-side live connection store for the shared event board.
 *
 * ## Why this shape (void.cloud constraints)
 *
 * The issue proposed a Cloudflare **Durable Object per event** fanning out over
 * SSE/WebSocket. On the **void platform** this app actually runs on, the three
 * Durable-Object-backed primitives — `void/ws` (`*.ws.ts`), `void/live`
 * (DO-backed SSE fanout) and `void/sandbox` — are all gated to "Void apps"
 * only. In SvelteKit (meta-framework) mode the void build *throws*:
 *   "live: void/live is currently supported in Void apps only."
 * (verified in node_modules/void/dist/index.mjs, and the docs for
 * guide/websockets + guide/live + reference/config). So no DO fanout is
 * available to us here.
 *
 * What IS available in framework mode is **plain `void/sse`** — a request-owned
 * `text/event-stream` `Response` from an ordinary SvelteKit `+server.ts`
 * endpoint (no DO). Our endpoint (`/e/[code]/live`) holds one SSE connection
 * per viewer and watches the event's data version server-side, emitting a
 * `change` event the instant it observes a new version. The client reacts by
 * calling `invalidateAll()`, so the existing load function re-runs and the
 * board updates with the existing `animate-pop-in` entrance — no manual
 * refresh. When SSE is unavailable we fall back to the pre-existing periodic
 * `invalidateAll()` poll.
 *
 * This module is deliberately transport-agnostic and side-effect-injected so
 * the reconnection / fallback **state machine** can be unit-tested in jsdom
 * without a real `EventSource` or a deployed server.
 */

export type LiveStatus = "connecting" | "connected" | "reconnecting" | "fallback";

/**
 * The subset of void's `SseClient` (from `void/sse/client`) this store relies
 * on. Declared structurally so the reconnection/fallback state machine can be
 * driven by a fake source in unit tests, with no real `EventSource`.
 */
export interface LiveSource {
  /** Subscribe to a named SSE event (e.g. "open", "change"). Returns an unsubscribe fn. */
  on(event: string, handler: (event: { data: unknown }) => void): () => void;
  /** Subscribe to transport errors. Returns an unsubscribe fn. */
  onError(handler: (event: Event) => void): () => void;
  close(): void;
}

export interface LiveStoreOptions {
  /** SSE endpoint URL (event-scoped, e.g. `/e/ABC123/live`). */
  url: string;
  /** Opens an SSE transport. Injected for testability. */
  openSource: (url: string) => LiveSource;
  /** Called when the server signals the board changed. Usually `invalidateAll`. */
  onChange: () => void | Promise<void>;
  /** Schedule a callback; returns a cancel handle. Defaults to setTimeout. */
  setTimer?: (cb: () => void, ms: number) => number;
  clearTimer?: (handle: number) => void;
  /**
   * After this many consecutive failed connection attempts we stop trying to
   * hold a live channel and drop to periodic polling ("fallback"). The browser
   * `EventSource` auto-reconnects, but a hard, repeated failure (endpoint 404,
   * proxy buffering, offline) should degrade gracefully.
   */
  maxReconnectAttempts?: number;
  /** Base backoff in ms; grows with attempt count, capped at 30s. */
  reconnectBaseMs?: number;
  /** Polling cadence used while in fallback mode (ms). */
  fallbackPollMs?: number;
  /**
   * How long to wait for the transport to fire "open" before treating the
   * attempt as failed. A transport can sit in CONNECTING indefinitely without
   * ever emitting an error (e.g. a proxy that buffers `text/event-stream` and
   * never flushes the response head — observed under the void/Vite dev proxy).
   * Without this guard we'd never advance to reconnect/fallback.
   */
  openTimeoutMs?: number;
}

const DEFAULTS = {
  maxReconnectAttempts: 4,
  reconnectBaseMs: 1000,
  fallbackPollMs: 20_000,
  openTimeoutMs: 5000,
};

export class LiveStore {
  /** Reactive connection state surfaced to the UI (drives the pulse dot). */
  status = $state<LiveStatus>("connecting");

  #opts: Required<Omit<LiveStoreOptions, "setTimer" | "clearTimer">> &
    Pick<LiveStoreOptions, "setTimer" | "clearTimer">;
  #source: LiveSource | null = null;
  #attempts = 0;
  #reconnectHandle: number | null = null;
  #pollHandle: number | null = null;
  #openTimeoutHandle: number | null = null;
  #stopped = false;

  constructor(opts: LiveStoreOptions) {
    this.#opts = {
      ...DEFAULTS,
      ...opts,
    };
  }

  #setTimer(cb: () => void, ms: number): number {
    return (this.#opts.setTimer ?? ((c, m) => setTimeout(c, m) as unknown as number))(
      cb,
      ms,
    );
  }

  #clearTimer(handle: number): void {
    (this.#opts.clearTimer ?? ((h) => clearTimeout(h)))(handle);
  }

  /** Open the live channel. Idempotent: a second call is a no-op while open. */
  start(): void {
    this.#stopped = false;
    if (this.#source) return;
    this.#openSource();
  }

  #openSource(): void {
    if (this.#stopped) return;
    // Leaving fallback (or first connect) — we're attempting a live channel.
    this.status = this.#attempts === 0 ? "connecting" : "reconnecting";

    let source: LiveSource;
    try {
      source = this.#opts.openSource(this.#opts.url);
    } catch {
      // Transport unavailable (e.g. no EventSource in this runtime). Treat it
      // like a connection failure so we degrade to polling instead of throwing.
      this.#handleError();
      return;
    }
    this.#source = source;

    source.on("open", () => this.#handleOpen());
    // Server signals a board change — re-fetch and re-render.
    source.on("change", () => {
      void this.#opts.onChange();
    });
    source.onError(() => this.#handleError());

    // Guard against a transport that never opens and never errors.
    this.#openTimeoutHandle = this.#setTimer(() => {
      this.#openTimeoutHandle = null;
      this.#handleError();
    }, this.#opts.openTimeoutMs);
  }

  #clearOpenTimeout(): void {
    if (this.#openTimeoutHandle !== null) {
      this.#clearTimer(this.#openTimeoutHandle);
      this.#openTimeoutHandle = null;
    }
  }

  #handleOpen(): void {
    this.#clearOpenTimeout();
    const wasReconnect = this.#attempts > 0;
    this.#attempts = 0;
    this.status = "connected";
    // Only reconcile after a genuine *re*connect (we may have missed updates
    // while down). On the very first connect the client already has fresh data
    // from its page load, and reconciling there can cause an invalidate→effect
    // re-run→reconnect loop.
    if (wasReconnect) void this.#opts.onChange();
  }

  #handleError(): void {
    if (this.#stopped) return;
    this.#clearOpenTimeout();
    this.#attempts += 1;
    this.#closeSource();

    if (this.#attempts >= this.#opts.maxReconnectAttempts) {
      this.#enterFallback();
      return;
    }

    this.status = "reconnecting";
    const delay = Math.min(
      this.#opts.reconnectBaseMs * 2 ** (this.#attempts - 1),
      30_000,
    );
    this.#reconnectHandle = this.#setTimer(() => {
      this.#reconnectHandle = null;
      this.#openSource();
    }, delay);
  }

  #enterFallback(): void {
    this.status = "fallback";
    if (this.#pollHandle !== null) return;
    const tick = () => {
      void this.#opts.onChange();
      this.#pollHandle = this.#setTimer(tick, this.#opts.fallbackPollMs);
    };
    this.#pollHandle = this.#setTimer(tick, this.#opts.fallbackPollMs);
  }

  #closeSource(): void {
    if (this.#source) {
      this.#source.close();
      this.#source = null;
    }
  }

  /** Tear everything down (call from the component's effect cleanup). */
  stop(): void {
    this.#stopped = true;
    this.#closeSource();
    this.#clearOpenTimeout();
    if (this.#reconnectHandle !== null) {
      this.#clearTimer(this.#reconnectHandle);
      this.#reconnectHandle = null;
    }
    if (this.#pollHandle !== null) {
      this.#clearTimer(this.#pollHandle);
      this.#pollHandle = null;
    }
  }
}
