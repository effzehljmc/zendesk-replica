import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type AdminStats = {
  ticketStats: {
    new: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  userCount: number;
  agentCount: number;
  kbArticleCount: number;
  recentTickets: {
    date: string;
    opened: number;
    closed: number;
  }[];
};

type Ticket = {
  status: string;
  created_at: string;
  updated_at: string;
};

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch ticket stats
        const { data: tickets, error: ticketError } = await supabase
          .from('tickets')
          .select('status');

        if (ticketError) throw ticketError;

        const ticketStats = {
          new: tickets?.filter(t => t.status === 'new').length || 0,
          open: tickets?.filter(t => t.status === 'open').length || 0,
          inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
          resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
        };

        // First, get the role IDs
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('id, name');

        if (rolesError) throw rolesError;

        const customerRoleId = roles?.find(r => r.name === 'customer')?.id;
        const agentRoleId = roles?.find(r => r.name === 'agent')?.id;

        if (!customerRoleId || !agentRoleId) {
          throw new Error('Required roles not found');
        }

        // Fetch user count (customers)
        const { count: userCount, error: userError } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', customerRoleId);

        if (userError) throw userError;

        // Fetch agent count
        const { count: agentCount, error: agentError } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', agentRoleId);

        if (agentError) throw agentError;

        // Fetch KB article count
        const { count: kbArticleCount, error: kbError } = await supabase
          .from('kb_articles')
          .select('*', { count: 'exact', head: true });

        if (kbError) throw kbError;

        // Fetch recent ticket activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentTickets, error: recentError } = await supabase
          .from('tickets')
          .select('created_at, status, updated_at')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (recentError) throw recentError;

        // Process ticket data by day
        const ticketsByDay = (recentTickets as Ticket[] || []).reduce((acc, ticket) => {
          const date = new Date(ticket.created_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { opened: 0, closed: 0 };
          }
          acc[date].opened++;
          if (ticket.status === 'resolved') {
            acc[date].closed++;
          }
          return acc;
        }, {} as Record<string, { opened: number; closed: number }>);

        const recentStats = Object.entries(ticketsByDay).map(([date, stats]) => ({
          date,
          ...stats,
        }));

        setStats({
          ticketStats,
          userCount: userCount || 0,
          agentCount: agentCount || 0,
          kbArticleCount: kbArticleCount || 0,
          recentTickets: recentStats,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, loading, error };
} 