import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AIMessageSuggestion, FeedbackReason } from '@/types/ai-suggestion';
import { ChevronDown, ChevronUp, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { FeedbackForm } from './ai-suggestion/feedback-form';

interface AISuggestionCardProps {
  suggestion: AIMessageSuggestion;
  status: 'loading' | 'success' | 'error';
  error?: string;
  onAccept: (text: string) => void;
  onReject: (feedback: { reason: FeedbackReason; additionalFeedback?: string }) => void;
  className?: string;
}

export function AISuggestionCard({
  suggestion,
  status,
  error,
  onAccept,
  onReject,
  className
}: AISuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(suggestion.suggested_response);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAccept = () => {
    if (isEditing) {
      onAccept(editedText);
    } else {
      setIsEditing(true);
      setEditedText(suggestion.suggested_response);
    }
  };

  const handleReject = (feedback: { reason: FeedbackReason; additionalFeedback?: string }) => {
    onReject(feedback);
    setShowFeedback(false);
  };

  return (
    <Card className={cn('w-full border-l-4', {
      'border-l-blue-500': status === 'loading',
      'border-l-green-500': status === 'success',
      'border-l-red-500': status === 'error',
    }, className)}>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span>AI Suggestion</span>
            {status === 'loading' && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
            <Badge variant="secondary" className="ml-2">
              {Math.round(suggestion.confidence_score * 100)}% Confidence
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <>
          <CardContent>
            {status === 'loading' ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : status === 'error' ? (
              <div className="text-destructive">
                {error || 'An error occurred while generating the suggestion'}
              </div>
            ) : isEditing ? (
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <>
                <div className="whitespace-pre-wrap rounded-md bg-muted p-4">
                  {suggestion.suggested_response}
                </div>
                {suggestion.metadata && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Model:</span> {suggestion.metadata.model}
                  </div>
                )}
              </>
            )}

            {showFeedback && (
              <div className="mt-4">
                <FeedbackForm
                  onSubmit={handleReject}
                  onCancel={() => setShowFeedback(false)}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            {!showFeedback && (
              <Button
                variant="outline"
                onClick={() => setShowFeedback(true)}
                disabled={status === 'loading'}
                className="gap-2"
              >
                <ThumbsDown className="h-4 w-4" />
                Reject
              </Button>
            )}
            
            {!showFeedback && (
              <Button
                onClick={handleAccept}
                disabled={status === 'loading'}
                className="gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                {isEditing ? 'Use Edited Response' : 'Use Suggestion'}
              </Button>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
