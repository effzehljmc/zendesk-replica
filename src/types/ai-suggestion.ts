export interface AIMessageSuggestion {
  id: string;
  ticket_id: string;
  suggested_response: string;
  confidence_score: number;
  system_user_id?: string;
  metadata?: {
    used_articles?: string[];
    model?: string;
    temperature?: number;
    additional_info?: Record<string, any>;
  };
  status: 'pending' | 'accepted' | 'rejected';
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAISuggestionData {
  ticket_id: string;
  suggested_response: string;
  confidence_score: number;
  system_user_id?: string;
  metadata?: {
    used_articles?: string[];
    model?: string;
    temperature?: number;
    additional_info?: Record<string, any>;
  };
}

export interface AIGenerationResponse {
  suggested_response: string;
  confidence_score: number;
  metadata: {
    used_articles?: string[];
    model: string;
    temperature: number;
  };
}

export type FeedbackType = 'rejection' | 'revision' | 'approval';
export type FeedbackReason = 'irrelevant' | 'off-topic' | 'incorrect_info' | 'too_generic';

export interface AIFeedback {
  suggestion_id: string;
  ticket_id: string;
  feedback_type: FeedbackType;
  feedback_reason?: FeedbackReason;
  agent_response?: string;
  time_to_feedback?: string;
  metadata?: Record<string, any>;
  updated_at: string;
}
