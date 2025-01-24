import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket, Tag } from '@/types/ticket';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { onTicketCreated } from '@/lib/ticket-automation';

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
  const { profile } = useAuth();
  const { isCustomer, loading: roleLoading } = useUserRole();

  const fetchTickets = async () => {
    try {
      // Don't fetch if we don't have the profile yet
      if (!profile?.id) {
        setTickets([]);
        return;
      }

      let query = supabase
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
              last_used_at,
              created_at
            )
          )
        `);

      // If user is a customer, only show their tickets
      if (isCustomer && profile.id) {
        query = query.eq('customer_id', profile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the Ticket type
      const transformedTickets = (data as TicketResponse[]).map(ticket => ({
        ...ticket,
        ticket_number: parseInt(ticket.ticket_number, 10),
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

  useEffect(() => {
    // Only fetch tickets when we have both profile and role information
    if (!roleLoading) {
      fetchTickets();
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: isCustomer ? `customer_id=eq.${profile?.id}` : undefined
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data: newTicket } = await supabase
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
                    last_used_at,
                    created_at
                  )
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (newTicket) {
              const transformedTicket = {
                ...newTicket,
                ticket_number: parseInt(newTicket.ticket_number, 10),
                tags: newTicket.tags?.map((t: { tag: Tag }) => t.tag) || []
              } as Ticket;
              
              setTickets(current => [transformedTicket, ...current]);
              
              // Call onTicketCreated for the new ticket
              await onTicketCreated(transformedTicket);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, isCustomer, roleLoading]);

  return {
    tickets,
    isLoading: isLoading || roleLoading,
    error,
    refetch: fetchTickets,
  };
} 