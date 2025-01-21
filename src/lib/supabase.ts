import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client using a closure
const createSupabaseClient = () => {
  let instance: ReturnType<typeof createClient<Database>> | null = null;

  return () => {
    if (!instance) {
      instance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: 'zendesk-replica-auth',
          storage: window.localStorage,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
      });
    }
    return instance;
  };
};

// Export the singleton getter
const getSupabase = createSupabaseClient();

// Export the singleton instance
export const supabase = getSupabase(); 