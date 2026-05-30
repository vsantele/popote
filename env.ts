import { defineEnv, string, number, boolean, oneOf, url } from "void/env";

export default defineEnv({
  PORT: number().default(5173),
  NODE_ENV: oneOf(["development", "production"]),
  DEBUG: boolean().optional(),
  VITE_APP_TITLE: string(),
  BETTER_AUTH_SECRET: string().secret(),
  BETTER_AUTH_URL: url().default("http://localhost:5173"),
  OTEL_EXPORTER_OTLP_ENDPOINT: url().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: string().optional().secret(),
  OTEL_SERVICE_NAME: string().optional(),
  OTEL_SERVICE_VERSION: string().optional(),
  // Web Push (VAPID). The public key is NOT secret — it is shipped to every
  // client to subscribe — so it lives in `void.json` worker.vars (tracked).
  // The private key + subject ARE secrets: keep them in `.env.local` locally
  // and set them with `void secret put` in production. Web push is disabled
  // gracefully (the opt-in control hides itself) when these are unset.
  VAPID_PUBLIC_KEY: string().optional(),
  VAPID_PRIVATE_KEY: string().optional().secret(),
  VAPID_SUBJECT: string().optional(),
});
