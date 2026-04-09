import { DEVICE_ID_KEY } from "$lib/utils/device-id";
import type { Handle } from "@sveltejs/kit";

/**
 * SvelteKit hooks for device ID authentication
 *
 * This hook extracts the device ID from cookies and attaches it to event.locals
 * for use in API routes and server load functions.
 *
 * Device ID Strategy:
 * - Generated client-side (crypto.randomUUID())
 * - Stored in localStorage on client
 * - Sent via cookie for SSR compatibility
 * - No accounts required (anonymous auth)
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Extract device ID from cookie
  const deviceId = event.cookies.get(DEVICE_ID_KEY);

  // Attach to event.locals for use in routes
  if (deviceId) {
    event.locals.deviceId = deviceId;
  }

  return resolve(event);
};
