import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Ticket, UpdateTicketData, Tag } from '@/types/ticket';
import { useAuth } from '@/contexts/AuthContext';

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

export function useTicket(id: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchTicket();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('ticket_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${id}`
        },
        () => {
          fetchTicket();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchTicket = async () => {
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
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform the data to match the Ticket type
      const transformedTicket = {
        ...data,
        tags: (data as TicketResponse).tags?.map(t => t.tag) || []
      } as Ticket;

      setTicket(transformedTicket);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch ticket'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicket = async (updates: UpdateTicketData) => {
    if (!profile) {
      throw new Error('No user profile found');
    }

    try {
      console.log('Starting ticket update:', { 
        updates, 
        profile,
        ticketId: id,
        currentTicket: ticket 
      });

      // Only update ticket fields if they are provided
      if (updates.title !== undefined || 
          updates.description !== undefined || 
          updates.priority !== undefined || 
          updates.status !== undefined || 
          updates.assigned_to_id !== undefined) {
        
        const { error: ticketError } = await supabase
          .from('tickets')
          .update({
            ...(updates.title && { title: updates.title }),
            ...(updates.description && { description: updates.description }),
            ...(updates.priority && { priority: updates.priority }),
            ...(updates.status && { status: updates.status }),
            ...(updates.assigned_to_id !== undefined && { assigned_to_id: updates.assigned_to_id }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (ticketError) {
          console.error('Error updating ticket:', ticketError);
          throw ticketError;
        }
      }

      // If tags are provided, update them
      if (updates.tags !== undefined) {
        console.log('Starting tag update process:', { 
          existingTags: ticket?.tags, 
          newTags: updates.tags,
          ticketId: id,
          profileId: profile.id
        });

        // First delete all existing tags
        const { data: deletedTags, error: deleteError } = await supabase
          .from('ticket_tags')
          .delete()
          .eq('ticket_id', id)
          .select();

        if (deleteError) {
          console.error('Error deleting existing tags:', deleteError);
          throw deleteError;
        }
        console.log('Deleted existing tags:', deletedTags);

        // Then add the new tags
        if (updates.tags.length > 0) {
          const tagInserts = updates.tags.map(tagId => ({
            ticket_id: id,
            tag_id: tagId,
            created_by_id: profile.id,
          }));
          console.log('Attempting to insert new tags:', tagInserts);

          const { data: insertedTags, error: tagError } = await supabase
            .from('ticket_tags')
            .insert(tagInserts)
            .select();

          if (tagError) {
            console.error('Error inserting new tags:', tagError);
            throw tagError;
          }
          console.log('Successfully inserted tags:', insertedTags);
        }
      }

      // Refetch the ticket to get the updated data
      console.log('Refetching ticket data...');
      await fetchTicket();
      console.log('Updated ticket data:', ticket);
    } catch (err) {
      console.error('Error in updateTicket:', err);
      throw err instanceof Error ? err : new Error('Failed to update ticket');
    }
  };

  return {
    ticket,
    isLoading,
    error,
    updateTicket,
    refetch: fetchTicket,
  };
} 