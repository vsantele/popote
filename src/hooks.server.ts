import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { createAuth } from "$lib/server/auth";

export const handle: Handle = async ({ event, resolve }) => {
  const auth = createAuth();
  event.locals.auth = auth;

  let session = await auth.api.getSession({ headers: event.request.headers });

  // Auto-create an anonymous session for any request that doesn't have one,
  // so every visitor has a stable user.id we can attach data to.
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
