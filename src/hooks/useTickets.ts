import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

export type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  customer_id: string;
  assigned_to_id: string | null;
  customer: {
    full_name: string;
    email: string;
  } | null;
  assigned_to: {
    full_name: string;
    email: string;
  } | null;
};

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    async function fetchTickets() {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('tickets')
          .select(`
            *,
            customer:profiles!customer_id(full_name, email),
            assigned_to:profiles!assigned_to_id(full_name, email)
          `);

        // If user is a customer, only show their tickets
        if (profile?.roles.some(role => role.name === 'customer')) {
          query = query.eq('customer_id', profile.id);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        setTickets(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tickets'));
        console.error('Error fetching tickets:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets'
        },
        (payload: RealtimePostgresChangesPayload<Database['public']['Tables']['tickets']['Row']>) => {
          console.log('Received realtime update:', payload);
          fetchTickets(); // Refetch all tickets for now
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile]);

  return { tickets, isLoading, error };
} 