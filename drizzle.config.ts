import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Parse connection string
const url = new URL(connectionString);
const [username, password] = url.username && url.password ? [url.username, url.password] : [];
const database = url.pathname.slice(1); // Remove leading slash

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port),
    user: username,
    password: password,
    database: database,
    ssl: true,
  },
} satisfies Config; 