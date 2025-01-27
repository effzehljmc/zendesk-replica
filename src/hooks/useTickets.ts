import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket, Tag } from '@/types/ticket';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { onTicketCreated } from '@/lib/ticket-automation';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const query = supabase
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
        .order('created_at', { ascending: false });

      if (isCustomer && profile?.id) {
        query.eq('customer_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedTickets = data.map(ticket => ({
        ...ticket,
        ticket_number: parseInt(ticket.ticket_number, 10),
        tags: ticket.tags?.map((t: { tag: Tag }) => t.tag) || []
      })) as Ticket[];

      setTickets(transformedTickets);
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tickets'));
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, isCustomer]);

  const setupSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('Cleaning up existing tickets subscription');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    console.log('Setting up new tickets subscription');
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: isCustomer && profile?.id ? `customer_id=eq.${profile.id}` : undefined
        },
        async (payload: RealtimePostgresChangesPayload<TicketResponse>) => {
          console.log('Received ticket update:', payload.eventType);
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
          } else if (payload.eventType === 'UPDATE') {
            // Fetch the updated ticket to get the complete data
            const { data: updatedTicket } = await supabase
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

            if (updatedTicket) {
              const transformedTicket = {
                ...updatedTicket,
                ticket_number: parseInt(updatedTicket.ticket_number, 10),
                tags: updatedTicket.tags?.map((t: { tag: Tag }) => t.tag) || []
              } as Ticket;
              
              setTickets(current => 
                current.map(ticket => 
                  ticket.id === transformedTicket.id ? transformedTicket : ticket
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setTickets(current => 
              current.filter(ticket => ticket.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Tickets subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('Error in tickets subscription');
          // Clean up and retry with a new subscription
          if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
          }
          setTimeout(() => setupSubscription(), 1000);
        }
      });

    channelRef.current = channel;
  }, [isCustomer, profile?.id]);

  useEffect(() => {
    console.log('Setting up tickets subscription');
    
    if (!roleLoading) {
      fetchTickets();
      setupSubscription();
    }

    return () => {
      if (channelRef.current) {
        console.log('Unmounting: Cleaning up tickets subscription');
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [roleLoading, fetchTickets, setupSubscription]);

  return {
    tickets,
    isLoading: isLoading || roleLoading,
    error,
    refetch: fetchTickets,
  };
} 