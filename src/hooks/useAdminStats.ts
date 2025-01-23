import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/utils';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
    satisfaction?: number | null;
  }[];
  agentStats: {
    id: string;
    name: string;
    tickets: number;
    responseTime: string;
    resolutionTime: string;
    satisfaction: number;
  }[];
};

interface AgentWithProfile {
  user_id: string;
  profiles: {
    id: string;
    full_name: string | null;
  };
}

interface TicketWithTimestamps {
  status: string;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  resolution_time: string | null;
  satisfaction_rating: number | null;
  assigned_to_id: string | null;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ticket stats
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('status, created_at, updated_at, first_response_at, resolution_time, satisfaction_rating, assigned_to_id');

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

      // Fetch agents with their profiles
      const { data: agents, error: agentsError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(
            id,
            full_name
          )
        `)
        .eq('role_id', agentRoleId)
        .returns<AgentWithProfile[]>();

      if (agentsError) throw agentsError;

      // Calculate agent performance metrics
      const agentStats = agents.map(agent => {
        const agentTickets = (tickets as TicketWithTimestamps[] || [])
          .filter(t => t.assigned_to_id === agent.user_id);
        const totalTickets = agentTickets.length;
        
        // Calculate average response time
        const responseTimes = agentTickets
          .filter(t => t.first_response_at)
          .map(t => new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime());
        const avgResponseTime = responseTimes.length > 0 
          ? formatDuration(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : "N/A";

        // Calculate average resolution time using the interval string
        const resolutionTimes = agentTickets
          .filter(t => t.resolution_time !== null)
          .map(t => {
            // Parse PostgreSQL interval string to milliseconds
            const matches = t.resolution_time!.match(/(\d+):(\d+):(\d+)/);
            if (matches) {
              const [_, hours, minutes, seconds] = matches;
              return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
            }
            return 0;
          })
          .filter(t => t > 0); // Filter out any failed parses

        const avgResolutionTime = resolutionTimes.length > 0
          ? formatDuration(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
          : "N/A";

        // Calculate satisfaction rating
        const ratings = agentTickets
          .filter(t => t.satisfaction_rating !== null)
          .map(t => t.satisfaction_rating!);
        const avgSatisfaction = ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;

        return {
          id: agent.user_id,
          name: agent.profiles.full_name || 'Unknown',
          tickets: totalTickets,
          responseTime: avgResponseTime,
          resolutionTime: avgResolutionTime,
          satisfaction: avgSatisfaction,
        };
      });

      // Fetch KB article count
      const { count: kbArticleCount, error: kbError } = await supabase
        .from('kb_articles')
        .select('*', { count: 'exact', head: true });

      if (kbError) throw kbError;

      // Process ticket data by day (last 5 days instead of 30)
      const thirtyDaysAgo = new Date('2025-01-19');
      thirtyDaysAgo.setHours(0, 0, 0, 0); // Set to start of day in local timezone

      const ticketsByDay = (tickets as TicketWithTimestamps[] || [])
        .reduce((acc, ticket) => {
          // Convert UTC dates to local timezone for comparison
          const ticketCreatedAt = new Date(ticket.created_at);
          const localCreatedDate = new Date(ticketCreatedAt.getTime() - (ticketCreatedAt.getTimezoneOffset() * 60000));
          localCreatedDate.setHours(0, 0, 0, 0);

          // Handle ticket creation date
          if (localCreatedDate >= thirtyDaysAgo) {
            const createdDate = localCreatedDate.toISOString().split('T')[0];
            if (!acc[createdDate]) {
              acc[createdDate] = { opened: 0, closed: 0, ratings: [] };
            }
            acc[createdDate].opened++;
          }

          // Handle ticket resolution date and satisfaction rating
          if (ticket.status === 'resolved') {
            const ticketUpdatedAt = new Date(ticket.updated_at);
            const localUpdatedDate = new Date(ticketUpdatedAt.getTime() - (ticketUpdatedAt.getTimezoneOffset() * 60000));
            localUpdatedDate.setHours(0, 0, 0, 0);
            
            if (localUpdatedDate >= thirtyDaysAgo) {
              const resolvedDate = localUpdatedDate.toISOString().split('T')[0];
              if (!acc[resolvedDate]) {
                acc[resolvedDate] = { opened: 0, closed: 0, ratings: [] };
              }
              acc[resolvedDate].closed++;

              // Add satisfaction rating if it exists
              if (ticket.satisfaction_rating !== null) {
                acc[resolvedDate].ratings.push(ticket.satisfaction_rating);
              }
            }
          }
          return acc;
        }, {} as Record<string, { opened: number; closed: number; ratings: number[] }>);

      // Ensure we have entries for all days in the range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!ticketsByDay[dateStr]) {
          ticketsByDay[dateStr] = { opened: 0, closed: 0, ratings: [] };
        }
      }

      const recentStats = Object.entries(ticketsByDay)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, stats]) => ({
          date,
          opened: stats.opened,
          closed: stats.closed,
          satisfaction: stats.ratings.length > 0
            ? stats.ratings.reduce((sum, rating) => sum + rating, 0) / stats.ratings.length
            : null
        }));

      setStats({
        ticketStats,
        userCount: userCount || 0,
        agentCount: agents.length,
        kbArticleCount: kbArticleCount || 0,
        recentTickets: recentStats,
        agentStats,
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates for tickets
    const channel = supabase
      .channel('admin_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        async (_payload: RealtimePostgresChangesPayload<any>) => {
          // Refetch stats when tickets change
          await fetchStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_notes'
        },
        async (_payload: RealtimePostgresChangesPayload<any>) => {
          // Refetch stats when notes change (affects response times)
          await fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading, error };
} 