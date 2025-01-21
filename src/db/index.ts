import { supabase } from '@/lib/supabase';

export { supabase };

// Helper to get user profile
export async function getUserProfile(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single();
  
  return profile;
} 