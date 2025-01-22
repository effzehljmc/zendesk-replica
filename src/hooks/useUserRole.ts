import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface RoleResponse {
  role: {
    name: string;
  };
}

export function useUserRole() {
  const [isCustomer, setIsCustomer] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    async function fetchUserRoles() {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select(`
            role:roles (
              name
            )
          `)
          .eq('user_id', profile?.id);

        if (error) throw error;

        const userRoles = data as unknown as RoleResponse[];
        const roles = userRoles?.map(ur => ur.role.name) || [];
        
        setIsCustomer(!roles.includes('agent') && !roles.includes('admin'));
        setIsAgent(roles.includes('agent'));
        setIsAdmin(roles.includes('admin'));
      } catch (err) {
        console.error('Error fetching user roles:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRoles();
  }, [profile?.id]);

  return {
    isCustomer,
    isAgent,
    isAdmin,
    loading
  };
} 