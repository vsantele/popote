import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { env } from "$env/dynamic/private";
import { getRequestEvent } from "$app/server";
import { db } from "void/db";
import { admin, anonymous, username } from "better-auth/plugins";

const authConfig = {
  baseURL: env.ORIGIN,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true },
  plugins: [
    admin(),
    anonymous(),
    username(),
    sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
  ],
} satisfies Omit<Parameters<typeof betterAuth>[0], "database">;

export const createAuth = () =>
  betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, { provider: "sqlite" }),
  });

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth();
