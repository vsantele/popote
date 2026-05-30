/**
 * A tiny fetch-based Server-Sent Events client that conforms to the same
 * `LiveSource` shape as void's `connectEventStream`.
 *
 * ## Why not native `EventSource`?
 *
 * void's `void/sse/client` wraps the browser's native `EventSource`. That works
 * on the deployed Cloudflare runtime, but the **local void/Vite dev proxy does
 * not flush `text/event-stream` responses to `EventSource`** — the connection
 * sits in CONNECTING forever (verified: a raw `fetch()` to the same endpoint
 * streams immediately, while `new EventSource(url)` never fires `open` or
 * `error`). Native `EventSource` also can't send custom headers and behaves
 * inconsistently behind buffering proxies.
 *
 * Reading the stream with `fetch()` + `ReadableStream` works in **both** dev
 * and production, so the live board is fully functional and demonstrable
 * everywhere. We parse the minimal SSE framing we emit server-side
 * (`event:` + `data:` + blank-line dispatch); comments (`:` keep-alives) are
 * ignored, which is exactly what we want.
 */
import type { LiveSource } from "./live-store.svelte";

type Handlers = Map<string, Array<(event: { data: unknown }) => void>>;

export function connectFetchEventStream(url: string): LiveSource {
  const handlers: Handlers = new Map();
  let errorHandler: ((event: Event) => void) | null = null;
  const controller = new AbortController();
  let closed = false;

  const emit = (event: string, data: unknown) => {
    for (const h of handlers.get(event) ?? []) h({ data });
  };

  const fail = () => {
    if (closed) return;
    errorHandler?.(new Event("error"));
  };

  void (async () => {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
        credentials: "same-origin",
      });
    } catch {
      fail();
      return;
    }

    if (!res.ok || !res.body) {
      fail();
      return;
    }

    // Headers received and body is streaming — this is our "open".
    emit("open", "");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by a blank line.
        let sep: number;
        while ((sep = indexOfDelimiter(buffer)) !== -1) {
          const rawEvent = buffer.slice(0, sep);
          buffer = buffer.slice(sep).replace(/^(\r\n\r\n|\n\n|\r\r)/, "");
          dispatch(rawEvent, emit);
        }
      }
      // Stream ended (server closed) — surface as an error so the store can
      // reconnect or fall back.
      fail();
    } catch {
      fail();
    }
  })();

  return {
    on(event, handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return () => {
        const next = (handlers.get(event) ?? []).filter((h) => h !== handler);
        handlers.set(event, next);
      };
    },
    onError(handler) {
      errorHandler = handler;
      return () => {
        if (errorHandler === handler) errorHandler = null;
      };
    },
    close() {
      closed = true;
      controller.abort();
    },
  };
}

/** Find the index of the first SSE record delimiter (blank line). */
function indexOfDelimiter(buffer: string): number {
  const candidates = ["\r\n\r\n", "\n\n", "\r\r"]
    .map((d) => buffer.indexOf(d))
    .filter((i) => i !== -1);
  return candidates.length ? Math.min(...candidates) : -1;
}

/** Parse one SSE record's lines into an event name + JSON-or-text data. */
function dispatch(raw: string, emit: (event: string, data: unknown) => void) {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split(/\r\n|\n|\r/)) {
    if (line === "" || line.startsWith(":")) continue; // comment / keep-alive
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    // Per the SSE spec a single leading space after the colon is stripped.
    const value = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0) return;
  const text = dataLines.join("\n");
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // leave as text
  }
  emit(event, data);
}
