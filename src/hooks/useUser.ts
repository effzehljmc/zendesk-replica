import { useSupabase } from '@/components/providers/supabase-provider';
import { useCallback, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
}

export function useUser() {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      // First get the authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setUser(null);
        return;
      }

      // Then get the profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error) throw error;

      setUser(profile);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch user profile'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    error,
    refetch: fetchUser,
  };
} 