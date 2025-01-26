import { createClient } from '@supabase/supabase-js';

// Create an in-memory storage for testing
const memoryStorage = {
  storage: new Map<string, string>(),
  getItem: function (key: string) {
    return this.storage.get(key) || null;
  },
  setItem: function (key: string, value: string) {
    this.storage.set(key, value);
  },
  removeItem: function (key: string) {
    this.storage.delete(key);
  }
};

// Create a mock Supabase client for testing
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key',
  {
    auth: {
      persistSession: false,
      storage: memoryStorage,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);
