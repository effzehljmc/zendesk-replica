export interface AIMessageSuggestion {
  id: string;
  ticketId: string;
  content: string;
  confidenceScore: number;
  sourceKBArticles: string[];  // IDs of relevant KB articles used
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  metadata?: {
    relevanceScore?: number;
    contextQuality?: number;
    additionalInfo?: Record<string, any>;
  };
}

export interface CreateAISuggestionData {
  ticketId: string;
  content: string;
  confidenceScore: number;
  sourceKBArticles: string[];
  metadata?: {
    relevanceScore?: number;
    contextQuality?: number;
    additionalInfo?: Record<string, any>;
  };
}

export interface AIGenerationResponse {
  success: boolean;
  suggestion?: AIMessageSuggestion;
  error?: string;
}

export interface AIFeedback {
  suggestionId: string;
  status: 'accepted' | 'rejected';
  feedback?: string;
  updatedAt: string;
}
