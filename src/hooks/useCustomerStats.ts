import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type CustomerStats = {
  ticketStats: {
    new: number;
    open: number;
    pending: number;
    resolved: number;
  };
  recentTickets: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    updated_at: string;
  }[];
  suggestedArticles: {
    id: string;
    title: string;
    excerpt: string;
  }[];
  averageResponseTime: number; // in hours
  satisfactionRating: number; // percentage
};

export function useCustomerStats() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    const customerId = profile.id;

    async function fetchStats() {
      try {
        // Fetch ticket stats
        const { data: tickets, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('customer_id', customerId);

        if (ticketError) throw ticketError;

        const ticketStats = {
          new: tickets?.filter(t => t.status === 'new').length || 0,
          open: tickets?.filter(t => t.status === 'open').length || 0,
          pending: tickets?.filter(t => t.status === 'pending').length || 0,
          resolved: tickets?.filter(t => t.status === 'resolved').length || 0,
        };

        // Fetch recent tickets (last 5 resolved)
        const { data: recentTickets, error: recentError } = await supabase
          .from('tickets')
          .select('id, title, status, created_at, updated_at')
          .eq('customer_id', customerId)
          .eq('status', 'resolved')
          .order('updated_at', { ascending: false })
          .limit(5);

        if (recentError) throw recentError;

        // Calculate average response time
        // First, get all tickets for this customer
        const { data: customerTickets, error: customerTicketsError } = await supabase
          .from('tickets')
          .select('id, created_at')
          .eq('customer_id', customerId);

        if (customerTicketsError) throw customerTicketsError;

        let totalResponseTime = 0;
        let responseCount = 0;

        // For each ticket, get its first agent response (public note)
        for (const ticket of customerTickets || []) {
          const { data: notes, error: notesError } = await supabase
            .from('ticket_notes')
            .select('created_at, created_by_id')
            .eq('ticket_id', ticket.id)
            .eq('visibility', 'public') // Only consider public notes
            .neq('created_by_id', customerId) // Exclude customer's own notes
            .order('created_at', { ascending: true })
            .limit(1);

          if (notesError) throw notesError;

          if (notes && notes.length > 0) {
            const firstResponse = new Date(notes[0].created_at);
            const ticketCreation = new Date(ticket.created_at);
            totalResponseTime += (firstResponse.getTime() - ticketCreation.getTime()) / (1000 * 60 * 60); // Convert to hours
            responseCount++;
          }
        }

        const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

        // Calculate satisfaction rating from ticket ratings
        const { data: ticketRatings, error: ratingsError } = await supabase
          .from('tickets')
          .select('satisfaction_rating')
          .eq('customer_id', customerId)
          .not('satisfaction_rating', 'is', null);

        if (ratingsError) throw ratingsError;

        const totalRatings = ticketRatings?.length || 0;
        const sumRatings = ticketRatings?.reduce((sum, ticket) => sum + (ticket.satisfaction_rating || 0), 0) || 0;
        // Assuming satisfaction_rating is on a scale of 1-5, calculate percentage
        const satisfactionRating = totalRatings > 0 ? (sumRatings / (totalRatings * 5)) * 100 : 0;

        // Fetch suggested KB articles based on ticket history
        const { data: ticketTitles } = await supabase
          .from('tickets')
          .select('title')
          .eq('customer_id', customerId)
          .limit(10);

        // Use ticket titles to find relevant KB articles
        const searchQuery = ticketTitles?.map(t => t.title).join(' ') || '';
        const { data: suggestedArticles, error: articlesError } = await supabase
          .from('kb_articles')
          .select('id, title, content')
          .textSearch('title', searchQuery, { type: 'websearch' })
          .limit(3);

        if (articlesError) throw articlesError;

        // Create excerpts from content
        const articlesWithExcerpts = (suggestedArticles || []).map(article => ({
          id: article.id,
          title: article.title,
          excerpt: article.content.substring(0, 150) + '...' // Create excerpt from content
        }));

        setStats({
          ticketStats,
          recentTickets: recentTickets || [],
          suggestedArticles: articlesWithExcerpts,
          averageResponseTime,
          satisfactionRating,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [profile?.id]);

  return { stats, loading, error };
} 