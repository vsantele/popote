import type { RequestHandler } from "./$types";
import { eventStream } from "void/sse";
import { eventVersion } from "$lib/server/realtime";
import { log } from "$lib/utils/logger";

/**
 * Live event stream for one event board (Server-Sent Events).
 *
 * void.cloud does not give SvelteKit apps Durable-Object fanout (see
 * `src/lib/server/realtime.ts` and the PR notes), so this request-owned SSE
 * stream watches the event's data version on a short interval and emits a
 * `change` event the instant it moves. The browser reacts by re-running the
 * page load (`invalidateAll()`), so adds / edits / removes / joins from other
 * guests appear within ~1s with no manual refresh. The client degrades to
 * periodic polling if this channel is unavailable.
 *
 * `eventStream()` keeps the connection alive with periodic SSE comments and
 * closes cleanly when the client disconnects (via the request abort signal).
 */

// How often the server re-checks the board version while a viewer is connected.
const POLL_MS = 1000;
// Cap a single stream's lifetime so connections (and their poll loops) can't
// accumulate unbounded; the client transparently reconnects. This also keeps
// each request well within Workers' per-invocation limits.
const MAX_STREAM_MS = 5 * 60 * 1000;

export const GET: RequestHandler = ({ params, request }) => {
  const shareCode = params.code.toUpperCase();

  return eventStream(
    async (stream) => {
      let lastToken: string | null = null;
      let interval: ReturnType<typeof setInterval> | undefined;
      let lifetime: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (interval) clearInterval(interval);
        if (lifetime) clearTimeout(lifetime);
      };

      const check = async () => {
        try {
          const { token } = await eventVersion(shareCode);
          if (lastToken === null) {
            // First probe just establishes the baseline; the client already
            // has fresh data from its initial page load.
            lastToken = token;
            return;
          }
          if (token !== lastToken) {
            lastToken = token;
            await stream.send({ event: "change", data: { token } });
          }
        } catch (err) {
          // A transient D1 hiccup shouldn't kill the stream; log and retry on
          // the next tick. A closed stream surfaces via stream.closed below.
          // Surface the underlying D1/SQLite error (DrizzleQueryError wraps the
          // real cause in `err.cause` — `String(err)` only shows the query text).
          const cause =
            err instanceof Error && err.cause instanceof Error
              ? err.cause.message
              : err instanceof Error && err.cause != null
                ? String(err.cause)
                : undefined;
          log("error", "Live version probe failed", {
            error: String(err),
            ...(cause !== undefined && { cause }),
          });
        }
      };

      // Flush an initial event right away so the client's stream reader
      // resolves promptly (some dev proxies buffer the response until the
      // first byte is written) and the connection registers as "open".
      await stream.send({ event: "ready", data: { ok: true } });

      // Establish the baseline immediately, then poll until the client leaves.
      await check();

      interval = setInterval(() => {
        void check();
      }, POLL_MS);

      // Self-close after a bounded lifetime; the client reconnects.
      lifetime = setTimeout(() => void stream.close(), MAX_STREAM_MS);

      stream.signal.addEventListener("abort", cleanup);
      await stream.closed;
      cleanup();
    },
    { signal: request.signal },
  );
};
