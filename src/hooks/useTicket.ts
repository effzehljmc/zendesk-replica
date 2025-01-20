import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Ticket } from './useTickets';

interface UpdateTicketData {
  status?: Ticket['status'];
  priority?: Ticket['priority'];
  assigned_to_id?: string | null;
}

export function useTicket(ticketId: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTicket() {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('tickets')
          .select(`
            *,
            customer:profiles!customer_id(full_name, email),
            assigned_to:profiles!assigned_to_id(full_name, email)
          `)
          .eq('id', ticketId)
          .single();

        if (supabaseError) throw supabaseError;
        setTicket(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch ticket'));
        console.error('Error fetching ticket:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTicket();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`ticket_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`,
        },
        async (payload) => {
          // Immediately update the local state with the new data
          if (payload.eventType === 'UPDATE') {
            const { data, error } = await supabase
              .from('tickets')
              .select(`
                *,
                customer:profiles!customer_id(full_name, email),
                assigned_to:profiles!assigned_to_id(full_name, email)
              `)
              .eq('id', ticketId)
              .single();
            
            if (!error && data) {
              setTicket(data);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ticketId]);

  const updateTicket = async (data: UpdateTicketData) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update(data)
        .eq('id', ticketId);

      if (error) throw error;

      // Optimistically update the local state
      if (ticket) {
        setTicket({
          ...ticket,
          ...data,
        });
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update ticket');
    }
  };

  return {
    ticket,
    isLoading,
    error,
    updateTicket,
  };
} 