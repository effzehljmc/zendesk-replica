import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackForm } from "./feedback-form";
import { AIMessageSuggestion } from "@/types/ai-suggestion";

interface SuggestionCardProps {
  suggestion: AIMessageSuggestion;
  onAccept: (suggestion: AIMessageSuggestion) => void;
  onReject: (suggestion: AIMessageSuggestion, feedback: { reason: string; additionalFeedback?: string }) => void;
}

export function SuggestionCard({ suggestion, onAccept, onReject }: SuggestionCardProps) {
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAccept = () => {
    onAccept(suggestion);
  };

  const handleReject = (feedback: { reason: string; additionalFeedback?: string }) => {
    onReject(suggestion, feedback);
    setIsRejecting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>AI Suggestion</span>
          <span className="text-sm font-normal">
            {Math.round(suggestion.confidence_score * 100)}% Confidence
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isRejecting ? (
          <FeedbackForm
            onSubmit={handleReject}
            onCancel={() => setIsRejecting(false)}
          />
        ) : (
          <div className="space-y-4">
            <p>{suggestion.suggested_response}</p>
            {suggestion.metadata?.model && (
              <p className="text-sm text-muted-foreground">Model: {suggestion.metadata.model}</p>
            )}
          </div>
        )}
      </CardContent>
      {!isRejecting && (
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsRejecting(true)}>
            Reject
          </Button>
          <Button onClick={handleAccept}>
            Accept
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 