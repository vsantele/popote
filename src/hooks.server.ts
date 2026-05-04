import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { createAuth } from "$lib/server/auth";
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

export const handle: Handle = sequence(paraglideHandle, authHandle);
