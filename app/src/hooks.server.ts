import { DEVICE_ID_KEY } from "$lib/utils/device-id";
import type { Handle } from "@sveltejs/kit";
import { runMigrations } from "$lib/server/db/migrate";

/**
 * SvelteKit hooks for device ID authentication and database migrations
 *
 * Device ID Strategy:
 * - Generated client-side (crypto.randomUUID())
 * - Stored in localStorage on client
 * - Sent via cookie for SSR compatibility
 * - No accounts required (anonymous auth)
 *
 * Database Migrations:
 * - Run automatically on app startup (once per process)
 * - Compatible with Aspire 13.2.2 (no AddNpmApp needed)
 * - Works in both development and production
 */

// Track if migrations have already run in this process
let migrationsRun = false;

export const handle: Handle = async ({ event, resolve }) => {
  // Run migrations once on first request
  if (!migrationsRun) {
    try {
      console.log("🔗 Running database migrations...");
      await runMigrations();
      console.log("✅ Database migrations completed successfully!");
      migrationsRun = true;
    } catch (error) {
      console.error("❌ Migration failed:", error);
      // Don't set migrationsRun = true so it retries on next request
      throw error;
    }
  }

  // Extract device ID from cookie
  const deviceId = event.cookies.get(DEVICE_ID_KEY);

  // Attach to event.locals for use in routes
  if (deviceId) {
    event.locals.deviceId = deviceId;
  }

  return resolve(event);
};
