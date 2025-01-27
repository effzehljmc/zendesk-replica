import { useState } from 'react';
import { AISuggestionCard } from '../AISuggestionCard';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { Button } from '../ui/button';
import { Wand2 } from 'lucide-react';

interface TicketAISuggestionsProps {
  ticketId: string;
  onAcceptSuggestion: (content: string) => void;
}

export function TicketAISuggestions({ 
  ticketId, 
  onAcceptSuggestion 
}: TicketAISuggestionsProps) {
  const [isManualTrigger, setIsManualTrigger] = useState(false);
  const { 
    suggestions, 
    isLoading, 
    triggerSuggestion, 
    acceptSuggestion,
    rejectSuggestion 
  } = useAISuggestions(ticketId);

  const handleManualTrigger = async () => {
    setIsManualTrigger(true);
    try {
      await triggerSuggestion();
    } finally {
      setIsManualTrigger(false);
    }
  };

  const activeSuggestion = suggestions?.[0];

  return (
    <div className="space-y-4">
      {(isLoading || activeSuggestion) && (
        <AISuggestionCard
          suggestion={activeSuggestion?.suggestion}
          status={activeSuggestion?.status || 'loading'}
          error={activeSuggestion?.error}
          onAccept={(text: string) => {
            if (activeSuggestion) {
              onAcceptSuggestion(text);
              acceptSuggestion(activeSuggestion.suggestion.id);
            }
          }}
          onReject={(feedback?: string) => {
            if (activeSuggestion) {
              rejectSuggestion(activeSuggestion.suggestion.id, feedback);
            }
          }}
        />
      )}
      
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualTrigger}
          disabled={isLoading || isManualTrigger}
        >
          <Wand2 className="w-4 h-4 mr-1" />
          {isManualTrigger ? 'Generating...' : 'Generate Suggestion'}
        </Button>
      </div>
    </div>
  );
}
