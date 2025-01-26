import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ThumbsUp, ThumbsDown, Bot, AlertCircle } from 'lucide-react';
import type { AIMessageSuggestion } from '../../types/ai-suggestion';
import { cn } from '../../lib/utils';

interface AISuggestionProps {
  suggestion: AIMessageSuggestion;
  onAccept: () => void;
  onReject: () => void;
  className?: string;
}

export function AISuggestion({ suggestion, onAccept, onReject, className }: AISuggestionProps) {
  const confidenceColor = suggestion.confidenceScore >= 0.8 
    ? 'bg-green-100 text-green-800' 
    : suggestion.confidenceScore >= 0.6 
      ? 'bg-yellow-100 text-yellow-800' 
      : 'bg-red-100 text-red-800';

  return (
    <Card className={cn('p-4 border-2 border-blue-100 bg-blue-50', className)}>
      <div className="flex items-start space-x-2">
        <Bot className="h-5 w-5 text-blue-600 mt-1" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-blue-600">AI Suggestion</span>
              <Badge 
                variant="secondary" 
                className={cn('text-xs', confidenceColor)}
              >
                {Math.round(suggestion.confidenceScore * 100)}% Confidence
              </Badge>
            </div>
            {suggestion.status === 'pending' && (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                  onClick={onAccept}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  onClick={onReject}
                >
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
          
          <div className="text-gray-700 whitespace-pre-wrap mb-2">
            {suggestion.content}
          </div>

          {suggestion.sourceKBArticles.length > 0 && (
            <div className="text-xs text-gray-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Based on {suggestion.sourceKBArticles.length} knowledge base article
              {suggestion.sourceKBArticles.length !== 1 && 's'}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
