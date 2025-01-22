import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const [isCustomer, setIsCustomer] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      fetchUserRoles();
    } else {
      setLoading(false);
    }
  }, [profile?.id]);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*, role:roles!inner(name)')
        .eq('user_id', profile?.id);

      if (error) throw error;

      const roleNames = data?.map(r => (r.role as { name: string }).name) || [];
      
      setIsCustomer(roleNames.includes('customer'));
      setIsAgent(roleNames.includes('agent'));
      setIsAdmin(roleNames.includes('admin'));
    } catch (err) {
      console.error('Error fetching user roles:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    isCustomer,
    isAgent,
    isAdmin,
    loading,
  };
} 