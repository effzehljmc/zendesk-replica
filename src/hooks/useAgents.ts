import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Agent = {
  id: string;
  full_name: string;
  email: string;
};

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: agentRoleData, error: roleError } = await supabase
          .from('roles')
          .select('id')
          .eq('name', 'agent')
          .maybeSingle();

        if (roleError) throw roleError;
        if (!agentRoleData) throw new Error('Agent role not found');

        const { data: agents, error: agentsError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            user_roles!inner(role_id)
          `)
          .eq('user_roles.role_id', agentRoleData.id);

        if (agentsError) throw agentsError;

        setAgents(agents || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch agents'));
        console.error('Error fetching agents:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgents();
  }, []);

  return { agents, isLoading, error };
} 