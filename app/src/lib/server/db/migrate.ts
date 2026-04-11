import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Database migration utility for Popote
 *
 * Usage:
 *   1. Standalone CLI: pnpm db:migrate
 *   2. Automatic on server startup (hooks.server.ts)
 *
 * Environment Variables:
 *   - ConnectionStrings__popotedb: PostgreSQL connection string from Aspire
 *   - DATABASE_URL: Fallback connection string
 *
 * Aspire Integration:
 *   Connection string automatically injected via Aspire service binding
 *   Works in both run mode (aspire start) and publish mode (deployment)
 */

export async function runMigrations() {
  // Get connection string from Aspire environment or fallback
  const connectionString =
    process.env.ConnectionStrings__popotedb || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "No database connection string found! Expected: ConnectionStrings__popotedb or DATABASE_URL"
    );
  }

  // Create postgres connection (for migrations)
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  try {
    // Resolve migrations folder path (works from both CLI and server hooks)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsFolder = path.join(__dirname, "migrations");

    // Run migrations from ./migrations directory
    await migrate(db, { migrationsFolder });
  } finally {
    await migrationClient.end();
  }
}

// CLI execution (when run directly with tsx)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🔗 Connecting to database...");
  
  runMigrations()
    .then(() => {
      console.log("✅ Migrations completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}
