import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";
// import { SpanStatusCode, trace } from "@opentelemetry/api";
import { building } from "$app/environment";
import { createAuth } from "$lib/server/auth";
// import {
//   ensureCloudflareTelemetry,
//   flushCloudflareTelemetry,
//   type TelemetryBindings,
// } from "$lib/server/telemetry";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { getTextDirection } from "$lib/paraglide/runtime";

const paraglideHandle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(
    event.request,
    ({ request: localizedRequest, locale }) => {
      event.request = localizedRequest;
      return resolve(event, {
        transformPageChunk: ({ html }) => {
          return html
            .replace("%lang%", locale)
            .replace("%dir%", getTextDirection(locale));
        },
      });
    },
  );

const authHandle: Handle = async ({ event, resolve }) => {
  const auth = createAuth();
  event.locals.auth = auth;

  let session = await auth.api.getSession({ headers: event.request.headers });

  if (!session && !event.url.pathname.startsWith("/api/auth")) {
    try {
      await auth.api.signInAnonymous({ headers: event.request.headers });
      const cookieHeader = event.cookies
        .getAll()
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
      const headers = new Headers(event.request.headers);
      headers.set("cookie", cookieHeader);
      session = await auth.api.getSession({ headers });
    } catch (err) {
      console.error("Failed to sign in anonymously:", err);
    }
  }

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};

const appHandle = sequence(paraglideHandle, authHandle);

function getRequestAttributes(event: Parameters<Handle>[0]["event"]) {
  return {
    "http.request.method": event.request.method,
    "url.full": event.url.toString(),
    "url.path": event.url.pathname,
    ...(event.url.search ? { "url.query": event.url.search.slice(1) } : {}),
  };
}

function getWaitUntil(
  platform: App.Platform | undefined,
): { waitUntil(promise: Promise<unknown>): void } | null {
  if (!platform) {
    return null;
  }

  if ("context" in platform && platform.context) {
    return platform.context;
  }

  if ("ctx" in platform && platform.ctx) {
    return platform.ctx;
  }

  return null;
}

export const handle: Handle = async ({ event, resolve }) => {
  // const telemetryBindings = event.platform?.env ?? {};
  // const provider = await ensureCloudflareTelemetry(
  //   telemetryBindings as TelemetryBindings,
  // );
  // const tracer = trace.getTracer("popote.server");

  // return tracer.startActiveSpan(
  //   "sveltekit.request",
  //   {
  //     attributes: getRequestAttributes(event),
  // },
  // async (span) => {
  try {
    const response = await appHandle({ event, resolve });
    // span.setAttribute("http.response.status_code", response.status);
    return response;
  } catch (error) {
    // span.recordException(
    //   error instanceof Error ? error : new Error(String(error)),
    // );
    // span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    // span.end();
    // if (provider) {
    //   flushCloudflareTelemetry(getWaitUntil(event.platform));
    // }
  }
};
//     },
//   );
// };
