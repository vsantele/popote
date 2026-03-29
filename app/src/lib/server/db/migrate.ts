import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database migration utility for Popote
 * 
 * Usage:
 *   pnpm tsx db/migrate.ts
 * 
 * Environment Variables:
 *   - ConnectionStrings__popotedb: PostgreSQL connection string from Aspire
 *   - DATABASE_URL: Fallback connection string
 * 
 * Aspire Integration:
 *   Connection string automatically injected via Aspire service binding
 */

async function runMigrations() {
  // Get connection string from Aspire environment or fallback
  const connectionString = 
    process.env.ConnectionStrings__popotedb || 
    process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ No database connection string found!');
    console.error('Expected: ConnectionStrings__popotedb or DATABASE_URL');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  
  // Create postgres connection (for migrations)
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  try {
    console.log('🚀 Running migrations...');
    
    // Run migrations from ./src/lib/server/db/migrations directory
    await migrate(db, { migrationsFolder: './src/lib/server/db/migrations' });
    
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
