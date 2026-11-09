import { defineEnvVars } from "@sveltejs/kit/env";
import { defineEnv, number, string, url } from "void/env";
import { z } from "zod";

export const variables = defineEnvVars({
  ORIGIN: {
    schema: z.string().optional(),
  },
  BETTER_AUTH_URL: {
    schema: z.string().optional(),
  },
  BETTER_AUTH_SECRET: {
    // Not optional in practice: better-auth throws on every request when the
    // secret is missing, and Void only provisions it automatically for apps
    // that wire auth through a project `auth.ts`. This app builds the auth
    // instance in `src/lib/server/auth.ts`, so set it yourself:
    //   void secret put BETTER_AUTH_SECRET    (production)
    //   BETTER_AUTH_SECRET=... in .env        (local)
    schema: z.string().optional(),
  },
  PUSH_CRON_SECRET: {
    schema: z.string().optional(),
  },
  VAPID_PUBLIC_KEY: {
    schema: z.string().optional(),
  },
  VAPID_PRIVATE_KEY: {
    schema: z.string().optional(),
  },
  VAPID_SUBJECT: {
    schema: z.string().optional(),
  },
  OTEL_EXPORTER_OTLP_ENDPOINT: {
    schema: z.string().optional(),
  },
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: {
    schema: z.string().optional(),
  },
  OTEL_EXPORTER_OTLP_HEADERS: {
    schema: z.string().optional(),
  },
  OTEL_SERVICE_NAME: {
    schema: z.string().optional(),
  },
  OTEL_SERVICE_VERSION: {
    schema: z.string().optional(),
  },
  SIGNOZ_ENDPOINT: {
    schema: z.string().optional(),
  },
  SIGNOZ_TRACES_ENDPOINT: {
    schema: z.string().optional(),
  },
  SIGNOZ_ACCESS_TOKEN: {
    schema: z.string().optional(),
  },
  SIGNOZ_INGESTION_KEY: {
    schema: z.string().optional(),
  },
  SIGNOZ_SERVICE_NAME: {
    schema: z.string().optional(),
  },
  SIGNOZ_SERVICE_VERSION: {
    schema: z.string().optional(),
  },
});

export default defineEnv({
  VITE_APP_NAME: string().default("La Popote"),
  VITE_APP_TITLE: string().default(
    "La Popote — Qui ramène quoi ? C'est réglé.",
  ),
  VITE_APP_URL: url().default("https://popote.vsantele.dev"),
  VITE_POLL_INTERVAL: number().default(5000),
  BETTER_AUTH_URL: url().optional(),
  BETTER_AUTH_SECRET: string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: url().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: string().optional(),
  OTEL_SERVICE_NAME: string().optional(),
  OTEL_SERVICE_VERSION: string().optional(),
  SIGNOZ_ENDPOINT: url().optional(),
  SIGNOZ_TRACES_ENDPOINT: url().optional(),
  SIGNOZ_ACCESS_TOKEN: string().optional(),
  SIGNOZ_INGESTION_KEY: string().optional(),
  SIGNOZ_SERVICE_NAME: string().optional(),
  SIGNOZ_SERVICE_VERSION: string().optional(),
  // Web Push (VAPID). The public key and subject are NOT secret — they live in
  // `void.config.ts` cloudflare.vars (tracked). The private key IS a secret:
  // keep it in `.env` locally and set it with `void secret put` in production.
  // Web push is disabled gracefully (the opt-in control hides itself) when unset.
  VAPID_PRIVATE_KEY: string().optional(),
});
