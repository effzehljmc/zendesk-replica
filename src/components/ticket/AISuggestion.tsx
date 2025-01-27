import { AIMessageSuggestion } from '@/types/ai-suggestion';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

interface AISuggestionProps {
  suggestion: AIMessageSuggestion;
  isLoading: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function AISuggestion({ 
  suggestion, 
  isLoading, 
  onAccept, 
  onReject 
}: AISuggestionProps) {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <span>AI Suggestion</span>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span>AI Suggestion</span>
            <Badge variant="secondary">
              {Math.round(suggestion.confidence_score * 100)}%
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap mb-4">{suggestion.suggested_response}</div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={onAccept} size="sm">Accept</Button>
        <Button onClick={onReject} variant="outline" size="sm">Reject</Button>
      </CardFooter>
    </Card>
  );
}
