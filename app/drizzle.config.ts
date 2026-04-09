import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POPOTEDB_URI!,
  },
  verbose: true,
  strict: true,
});
