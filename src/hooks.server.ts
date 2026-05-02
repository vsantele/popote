import { DEVICE_ID_KEY } from "$lib/utils/device-id";
import type { Handle } from "@sveltejs/kit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { createAuth } from "$lib/server/auth";
import { db } from "void/db";

export const handle: Handle = async ({ event, resolve }) => {
  // Extract device ID from cookie
  const deviceId = event.cookies.get(DEVICE_ID_KEY);

  // Attach to event.locals for use in routes
  if (deviceId) {
    event.locals.deviceId = deviceId;
  }

  event.locals.auth = createAuth();

  const { auth } = event.locals;
  const session = await auth.api.getSession({ headers: event.request.headers });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  return resolve(event);
};
