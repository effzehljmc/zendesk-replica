import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// This file should only be imported in server-side code
export function createDrizzleClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const queryClient = postgres(process.env.DATABASE_URL, {
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(queryClient);
} 