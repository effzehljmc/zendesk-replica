import { useSupabase } from '@/components/providers/supabase-provider';
import { AIFeedback, AIMessageSuggestion } from '@/types/ai-suggestion';
import { useCallback, useEffect, useState } from 'react';

interface SuggestionState {
  suggestion: AIMessageSuggestion;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export function useAISuggestions(ticketId: string) {
  const { supabase } = useSupabase();
  const [suggestions, setSuggestions] = useState<SuggestionState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch initial suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('ai_suggestions')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching suggestions:', error);
          return;
        }

        setSuggestions(
          data.map((suggestion) => ({
            suggestion,
            status: 'success' as const,
          }))
        );
      } catch (error) {
        console.error('Error in fetchSuggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [ticketId, supabase]);

  // Subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel(`ai_suggestions:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_suggestions',
          filter: `ticket_id=eq.${ticketId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSuggestion = payload.new as AIMessageSuggestion;
            setSuggestions(currentSuggestions => {
              // Check if suggestion already exists
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
            setSuggestions(currentSuggestions =>
              currentSuggestions.map(s => 
                s.suggestion.id === payload.new.id 
                  ? { ...s, suggestion: payload.new as AIMessageSuggestion }
                  : s
              )
            );
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
      channel.unsubscribe();
    };
  }, [ticketId, supabase]);

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

  const acceptSuggestion = useCallback(
    async (suggestion_id: string, status: 'accepted' | 'rejected' = 'accepted', feedback?: string) => {
      const feedback_data: AIFeedback = {
        suggestion_id,
        status,
        feedback,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ai_suggestions')
        .update({
          status,
          feedback: feedback_data.feedback,
          updated_at: feedback_data.updated_at,
        })
        .eq('id', suggestion_id);

      if (error) {
        console.error('Error updating suggestion:', error);
        throw error;
      }

      // Remove the suggestion from local state immediately
      setSuggestions(currentSuggestions => 
        currentSuggestions.filter(s => s.suggestion.id !== suggestion_id)
      );
    },
    [supabase]
  );

  const rejectSuggestion = useCallback(
    async (suggestion_id: string, feedback?: string) => {
      return acceptSuggestion(suggestion_id, 'rejected', feedback);
    },
    [acceptSuggestion]
  );

  return {
    suggestions,
    isLoading,
    triggerSuggestion,
    acceptSuggestion,
    rejectSuggestion,
  };
}
