import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { ORIGIN, BETTER_AUTH_URL, BETTER_AUTH_SECRET } from "$app/env/private";
import { getRequestEvent } from "$app/server";
import { db, eq } from "void/db";
import { admin } from "better-auth/plugins/admin";
import { anonymous } from "better-auth/plugins/anonymous";
import { username } from "better-auth/plugins/username";
import { events, participants } from "@schema";
import * as schema from "@schema";

export const createAuth = () =>
  betterAuth({
    baseURL: ORIGIN ?? BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
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
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
  });
