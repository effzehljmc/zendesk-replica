import { useState } from 'react';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SuggestionState } from '@/hooks/useAISuggestions';

interface TicketAISuggestionsProps {
  ticketId: string;
  className?: string;
}

export function TicketAISuggestions({ ticketId, className }: TicketAISuggestionsProps) {
  const { suggestions, rejectSuggestion: rejectAISuggestion } = useAISuggestions(ticketId);
  const [activeSuggestion, setActiveSuggestion] = useState<SuggestionState | null>(suggestions?.[0] || null);
  const [feedback, setFeedback] = useState('');

  const handleReject = async (suggestionId: string, feedback?: string) => {
    try {
      await rejectAISuggestion(suggestionId, 'irrelevant', feedback || undefined);
      setActiveSuggestion(null);
      setFeedback('');
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  if (!activeSuggestion) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="p-4 border rounded-lg bg-background">
        <h3 className="font-medium mb-2">AI Suggested Response</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {activeSuggestion.suggestion.suggested_response}
        </p>
        <div className="space-y-4">
          <Textarea
            placeholder="Optional feedback for rejection..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleReject(activeSuggestion.suggestion.id, feedback)}
            >
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
