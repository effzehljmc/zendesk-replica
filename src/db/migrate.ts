import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDrizzleClient } from './server';

// Simple logger that respects ESLint rules
const logger = {
  info: (message: string) => process.stdout.write(`${message}\n`),
  error: (message: string, error?: unknown) => process.stderr.write(`${message}\n${error ? String(error) : ''}\n`),
};

const runMigrations = async () => {
  const db = createDrizzleClient();

  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
};

runMigrations().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
}); 