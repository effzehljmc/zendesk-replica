import React, { useEffect } from 'react';
import { TicketMessages } from './TicketMessages';
import { AISuggestion } from './AISuggestion';
import { useAISuggestions } from '../../hooks/useAISuggestions';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { Skeleton } from '../ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface TicketConversationProps {
  ticketId: string;
}

export function TicketConversation({ ticketId }: TicketConversationProps) {
  const { messages, isLoading: messagesLoading } = useTicketMessages(ticketId);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    error,
    generateSuggestion,
    provideFeedback,
  } = useAISuggestions(ticketId);

  // Generate a suggestion when a new customer message is received
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isAIGenerated) {
      generateSuggestion();
    }
  }, [messages, generateSuggestion]);

  if (messagesLoading || suggestionsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const handleAcceptSuggestion = async (suggestionId: string) => {
    await provideFeedback({
      suggestionId,
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    await provideFeedback({
      suggestionId,
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load AI suggestions: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Interleave messages and suggestions */}
      {messages.map((message, index) => {
        const relevantSuggestion = suggestions.find(
          s => s.status === 'pending' && 
          new Date(s.createdAt) > new Date(message.createdAt) &&
          (index === messages.length - 1 || new Date(s.createdAt) < new Date(messages[index + 1].createdAt))
        );

        return (
          <React.Fragment key={message.id}>
            <TicketMessages.Message message={message} />
            {relevantSuggestion && (
              <AISuggestion
                suggestion={relevantSuggestion}
                onAccept={() => handleAcceptSuggestion(relevantSuggestion.id)}
                onReject={() => handleRejectSuggestion(relevantSuggestion.id)}
                className="ml-8"
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Message input */}
      <TicketMessages.Input ticketId={ticketId} />
    </div>
  );
}
