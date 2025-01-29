import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { AISuggestionCard } from './AISuggestionCard';
import { useEffect } from 'react';
import { FeedbackReason } from '@/types/ai-suggestion';

interface AISuggestionsProps {
  ticketId: string;
  className?: string;
}

export function AISuggestions({ ticketId, className }: AISuggestionsProps) {
  console.log('Mounting AISuggestions component for ticket:', ticketId);
  const { suggestions, acceptSuggestion, rejectSuggestion } = useAISuggestions(ticketId);
  const { createMessage } = useTicketMessages(ticketId);

  useEffect(() => {
    console.log('Current suggestions:', suggestions);
  }, [suggestions]);

  if (suggestions.length === 0) {
    console.log('No suggestions available for ticket:', ticketId);
    return null;
  }

  const handleAccept = async (suggestionId: string, text: string) => {
    try {
      // Add the message first and wait for it to complete
      const message = await createMessage({
        content: text,
        isAIGenerated: true
      });
      
      console.log('Message created successfully:', message);
      
      // Only after message is created, mark suggestion as accepted
      await acceptSuggestion(suggestionId);
      
      console.log('Suggestion accepted successfully:', suggestionId);
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
    }
  };

  const handleReject = async (suggestionId: string, feedback: { reason: FeedbackReason; additionalFeedback?: string }) => {
    try {
      // Store feedback and mark as rejected
      await rejectSuggestion(suggestionId, feedback.reason, feedback.additionalFeedback);
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  return (
    <div className="space-y-4">
      {suggestions.map(({ suggestion, status, error }) => (
        <AISuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          status={status}
          error={error}
          onAccept={(text) => handleAccept(suggestion.id, text)}
          onReject={(feedback) => handleReject(suggestion.id, feedback)}
          className={className}
        />
      ))}
    </div>
  );
}
