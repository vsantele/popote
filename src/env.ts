import { defineEnvVars } from '@sveltejs/kit/env';
import {z} from "zod"
// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
export const variables = defineEnvVars({
	VAPID_PUBLIC_KEY: { schema: z.string().default('') },
	PUSH_CRON_SECRET: { schema: z.string().default('') },
	VAPID_PRIVATE_KEY: { schema: z.string().default('') },
	VAPID_SUBJECT: { schema: z.string().default('') },
	ORIGIN: { schema: z.string().default('') },
	BETTER_AUTH_URL: { schema: z.string().default('') },
	BETTER_AUTH_SECRET: { schema: z.string().default('') }
});
