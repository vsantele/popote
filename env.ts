import { defineEnv, string, number, boolean, oneOf, url } from "void/env";

export default defineEnv({
  PORT: number().default(5173),
  NODE_ENV: oneOf(["development", "production"]),
  DEBUG: boolean().optional(),
  VITE_APP_TITLE: string(),
  BETTER_AUTH_SECRET: string().secret(),
  BETTER_AUTH_URL: url().default("http://localhost:5173"),
});
