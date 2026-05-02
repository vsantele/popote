import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { env } from "$env/dynamic/private";
import { getRequestEvent } from "$app/server";
import { db, eq } from "void/db";
import { admin, anonymous, username } from "better-auth/plugins";
import { events, participants } from "@schema";
import * as schema from "@schema";

const authConfig = {
  baseURL: env.ORIGIN ?? env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, autoSignIn: true },
  plugins: [
    admin(),
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await db
          .update(events)
          .set({ hostUserId: newUser.user.id })
          .where(eq(events.hostUserId, anonymousUser.user.id));
        await db
          .update(participants)
          .set({ userId: newUser.user.id })
          .where(eq(participants.userId, anonymousUser.user.id));
      },
    }),
    username(),
    sveltekitCookies(getRequestEvent), // make sure this is the last plugin in the array
  ],
} satisfies Omit<Parameters<typeof betterAuth>[0], "database">;

export const createAuth = () =>
  betterAuth({
    ...authConfig,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
  });

/**
 * DO NOT USE!
 *
 * This instance is used by the `better-auth` CLI for schema generation ONLY.
 * To access `auth` at runtime, use `event.locals.auth`.
 */
export const auth = createAuth();
