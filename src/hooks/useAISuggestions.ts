import { useState, useEffect } from 'react';
import { generateAISuggestion, updateSuggestionStatus, getSuggestions } from '../lib/ai-suggestions';
import type { AIMessageSuggestion, AIFeedback } from '../types/ai-suggestion';

export function useAISuggestions(ticketId: string) {
  const [suggestions, setSuggestions] = useState<AIMessageSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketId) {
      loadSuggestions();
    }
  }, [ticketId]);

  const loadSuggestions = async () => {
    try {
      const data = await getSuggestions(ticketId);
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    }
  };

  const generateSuggestion = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await generateAISuggestion(ticketId);
      if (response.success && response.suggestion) {
        setSuggestions(prev => [response.suggestion, ...prev]);
      } else {
        setError(response.error || 'Failed to generate suggestion');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  const provideFeedback = async (feedback: AIFeedback) => {
    try {
      const success = await updateSuggestionStatus(feedback);
      if (success) {
        setSuggestions(prev =>
          prev.map(suggestion =>
            suggestion.id === feedback.suggestionId
              ? { ...suggestion, status: feedback.status }
              : suggestion
          )
        );
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update suggestion');
      return false;
    }
  };

  return {
    suggestions,
    isLoading,
    error,
    generateSuggestion,
    provideFeedback,
    refreshSuggestions: loadSuggestions
  };
}
