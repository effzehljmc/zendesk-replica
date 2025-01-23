import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDuration } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type AgentStats = {
  ticketStats: {
    new: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  recentTickets: {
    date: string;
    opened: number;
    closed: number;
  }[];
  performance: {
    totalTickets: number;
    responseTime: string;
    resolutionTime: string;
    satisfaction: number;
  };
};

interface TicketWithTimestamps {
  status: string;
  created_at: string;
  updated_at: string;
  first_response_at: string | null;
  resolution_time: string | null;
  satisfaction_rating: number | null;
}

export function useAgentStats() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  const fetchStats = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch tickets assigned to the current agent
      const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('status, created_at, updated_at, first_response_at, resolution_time, satisfaction_rating')
        .eq('assigned_to_id', profile.id);

      if (ticketError) throw ticketError;

      // Calculate ticket stats
      const ticketStats = {
        new: tickets?.filter(t => t.status === 'new').length || 0,
        open: tickets?.filter(t => t.status === 'open').length || 0,
        inProgress: tickets?.filter(t => t.status === 'in_progress').length || 0,
        resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
      };

      // Calculate performance metrics
      const agentTickets = tickets as TicketWithTimestamps[] || [];
      const totalTickets = agentTickets.length;
      
      // Calculate average response time
      const responseTimes = agentTickets
        .filter(t => t.first_response_at)
        .map(t => new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime());
      const avgResponseTime = responseTimes.length > 0 
        ? formatDuration(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : "N/A";

      // Calculate average resolution time
      const resolutionTimes = agentTickets
        .filter(t => t.resolution_time !== null)
        .map(t => {
          const matches = t.resolution_time!.match(/(\d+):(\d+):(\d+)/);
          if (matches) {
            const [_, hours, minutes, seconds] = matches;
            return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
          }
          return 0;
        })
        .filter(t => t > 0);

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

      // Process ticket data by day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0); // Set to start of day in local timezone

      const ticketsByDay = agentTickets
        .reduce((acc, ticket) => {
          // Convert UTC dates to local timezone for comparison
          const ticketCreatedAt = new Date(ticket.created_at);
          const localCreatedDate = new Date(ticketCreatedAt.getTime() - (ticketCreatedAt.getTimezoneOffset() * 60000));
          localCreatedDate.setHours(0, 0, 0, 0);

          // Handle ticket creation date
          if (localCreatedDate >= thirtyDaysAgo) {
            const createdDate = localCreatedDate.toISOString().split('T')[0];
            if (!acc[createdDate]) {
              acc[createdDate] = { opened: 0, closed: 0 };
            }
            acc[createdDate].opened++;
          }

          // Handle ticket resolution date
          if (ticket.status === 'resolved') {
            const ticketUpdatedAt = new Date(ticket.updated_at);
            const localUpdatedDate = new Date(ticketUpdatedAt.getTime() - (ticketUpdatedAt.getTimezoneOffset() * 60000));
            localUpdatedDate.setHours(0, 0, 0, 0);
            
            if (localUpdatedDate >= thirtyDaysAgo) {
              const resolvedDate = localUpdatedDate.toISOString().split('T')[0];
              if (!acc[resolvedDate]) {
                acc[resolvedDate] = { opened: 0, closed: 0 };
              }
              acc[resolvedDate].closed++;
            }
          }
          return acc;
        }, {} as Record<string, { opened: number; closed: number }>);

      const recentStats = Object.entries(ticketsByDay)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, stats]) => ({
          date,
          ...stats,
        }));

      setStats({
        ticketStats,
        recentTickets: recentStats,
        performance: {
          totalTickets,
          responseTime: avgResponseTime,
          resolutionTime: avgResolutionTime,
          satisfaction: avgSatisfaction,
        },
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
      .channel('agent_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `assigned_to_id=eq.${profile?.id}`
        },
        async (_payload: RealtimePostgresChangesPayload<any>) => {
          // Refetch stats when tickets change
          await fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { stats, loading, error };
} 