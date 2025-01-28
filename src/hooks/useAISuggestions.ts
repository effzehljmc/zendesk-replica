import { useSupabase } from '@/components/providers/supabase-provider';
import { AIFeedback, AIMessageSuggestion } from '@/types/ai-suggestion';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useUser } from '@/hooks/useUser';

export interface SuggestionState {
  suggestion: AIMessageSuggestion;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export function useAISuggestions(ticketId: string) {
  const { supabase } = useSupabase();
  const { isAdmin, isAgent } = useUserRole();
  const { user } = useUser();
  const [suggestions, setSuggestions] = useState<SuggestionState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching suggestions with auth state:', { isAdmin, isAgent });
      
      const { data, error, count } = await supabase
        .from('ai_suggestions')
        .select('*', { count: 'exact' })
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      console.log('Fetch result:', { 
        success: !error, 
        count, 
        error: error?.message,
        data: data?.length
      });

      if (error) throw error;

      setSuggestions(
        data.map(suggestion => ({
          suggestion,
          status: 'success'
        }))
      );
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch AI suggestions'));
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, isAdmin, isAgent]);

  useEffect(() => {
    console.log('Setting up AI suggestions subscription for ticket:', ticketId);
    fetchSuggestions();

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous AI suggestions subscription for ticket:', ticketId);
      channelRef.current.unsubscribe();
    }

    // Create new subscription
    channelRef.current = supabase
      .channel(`ai_suggestions:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_suggestions',
          filter: `ticket_id=eq.${ticketId}`
        },
        async (payload) => {
          console.log('Received AI suggestion update:', payload.eventType, 'for ticket:', ticketId);
          if (payload.eventType === 'INSERT') {
            const newSuggestion = payload.new as AIMessageSuggestion;
            setSuggestions(currentSuggestions => {
              const exists = currentSuggestions.some(s => s.suggestion.id === newSuggestion.id);
              if (exists) {
                return currentSuggestions;
              }
              return [...currentSuggestions, {
                suggestion: newSuggestion,
                status: 'success'
              }];
            });
          } else if (payload.eventType === 'DELETE') {
            setSuggestions(currentSuggestions => 
              currentSuggestions.filter(s => s.suggestion.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedSuggestion = payload.new as AIMessageSuggestion;
            setSuggestions(currentSuggestions => {
              // If suggestion is accepted or rejected, remove it from the list
              if (updatedSuggestion.status === 'accepted' || updatedSuggestion.status === 'rejected') {
                return currentSuggestions.filter(s => s.suggestion.id !== updatedSuggestion.id);
              }
              // Otherwise update it
              return currentSuggestions.map(s => 
                s.suggestion.id === updatedSuggestion.id 
                  ? { ...s, suggestion: updatedSuggestion }
                  : s
              );
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to AI suggestions for ticket:', ticketId);
        } else if (status === 'CLOSED') {
          console.log('AI suggestions subscription closed for ticket:', ticketId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error in AI suggestions subscription for ticket:', ticketId);
        }
      });

    return () => {
      if (channelRef.current) {
        console.log('Unmounting: Cleaning up AI suggestions subscription for ticket:', ticketId);
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [ticketId, fetchSuggestions]);

  const triggerSuggestion = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/generate-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ticketId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestion');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error triggering suggestion:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const storeFeedback = useCallback(
    async (feedback: AIFeedback) => {
      if (!user?.id) {
        // Wait for user data to be available
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!user?.id) {
          throw new Error('No user ID available');
        }
      }

      const now = new Date().toISOString();
      
      // First update the suggestion status
      const { error: suggestionError } = await supabase
        .from('ai_suggestions')
        .update({
          status: feedback.feedback_type === 'approval' ? 'accepted' : 'rejected',
          updated_at: now,
        })
        .eq('id', feedback.suggestion_id);

      if (suggestionError) {
        console.error('Error updating suggestion status:', suggestionError);
        throw suggestionError;
      }

      // Then store the feedback
      const { error: feedbackError } = await supabase
        .from('ai_feedback_events')
        .insert({
          suggestion_id: feedback.suggestion_id,
          ticket_id: feedback.ticket_id,
          agent_id: user.id,
          feedback_type: feedback.feedback_type,
          feedback_reason: feedback.feedback_reason || null,
          agent_response: feedback.agent_response || null,
          time_to_feedback: '0 seconds', // Default interval value
          metadata: feedback.metadata || {},
          created_at: now,
          updated_at: now
        });

      if (feedbackError) {
        console.error('Error storing feedback event:', feedbackError);
        throw feedbackError;
      }
    },
    [supabase, user?.id]
  );

  const acceptSuggestion = useCallback(
    async (suggestion_id: string) => {
      const now = new Date().toISOString();
      const feedback: AIFeedback = {
        suggestion_id,
        ticket_id: ticketId,
        feedback_type: 'approval',
        updated_at: now
      };

      await storeFeedback(feedback);

      // Remove the suggestion from local state immediately
      setSuggestions(currentSuggestions => 
        currentSuggestions.filter(s => s.suggestion.id !== suggestion_id)
      );
    },
    [ticketId, storeFeedback]
  );

  const rejectSuggestion = useCallback(
    async (suggestion_id: string, reason: string, additionalFeedback?: string) => {
      const now = new Date().toISOString();
      const feedback: AIFeedback = {
        suggestion_id,
        ticket_id: ticketId,
        feedback_type: 'rejection',
        feedback_reason: reason as AIFeedback['feedback_reason'],
        metadata: additionalFeedback ? { additional_feedback: additionalFeedback } : undefined,
        updated_at: now
      };

      try {
        await storeFeedback(feedback);
      } catch (error) {
        console.error('Error rejecting suggestion:', error);
        throw error;
      }
    },
    [ticketId, storeFeedback]
  );

  return {
    suggestions,
    isLoading,
    error,
    refetch: fetchSuggestions,
    triggerSuggestion,
    acceptSuggestion,
    rejectSuggestion,
  };
}
