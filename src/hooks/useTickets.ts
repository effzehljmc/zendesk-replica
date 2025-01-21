import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket, Tag } from '@/types/ticket';

interface TicketResponse {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: Ticket['priority'];
  status: Ticket['status'];
  created_at: string;
  updated_at: string;
  customer_id: string;
  assigned_to_id: string | null;
  customer?: {
    full_name: string;
    email: string;
  };
  assigned_to?: {
    full_name: string;
  };
  tags: { tag: Tag }[];
}

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchTickets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        () => {
          fetchTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_tags'
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:profiles!tickets_customer_id_fkey (
            full_name,
            email
          ),
          assigned_to:profiles!tickets_assigned_to_id_fkey (
            full_name
          ),
          tags:ticket_tags (
            tag:tags (
              id,
              name,
              color,
              usage_count,
              last_used_at
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the Ticket type
      const transformedTickets = (data as TicketResponse[]).map(ticket => ({
        ...ticket,
        tags: ticket.tags?.map(t => t.tag) || []
      })) as Ticket[];

      setTickets(transformedTickets);
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tickets'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets,
  };
} 