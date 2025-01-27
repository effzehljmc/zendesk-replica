import { supabase } from './supabase';
import type { AIGenerationResponse, AIFeedback } from '../types/ai-suggestion';

async function searchKnowledgeBase(query: string) {
  const { data, error } = await supabase
    .from('knowledge_base_articles')
    .select('*')
    .textSearch('content', query)
    .limit(5);

  if (error) {
    console.error('Error searching knowledge base:', error);
    return [];
  }

  return data;
}

export async function generateAISuggestion(ticketId: string): Promise<AIGenerationResponse> {
  try {
    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) {
      throw ticketError;
    }

    // Search knowledge base for relevant articles
    const relevantArticles = await searchKnowledgeBase(ticket.description);

    // Call OpenAI API
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket,
        relevantArticles,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate AI suggestion');
    }

    const data = await response.json();
    return {
      suggested_response: data.suggested_response,
      confidence_score: data.confidence_score,
      metadata: {
        model: data.metadata.model,
        temperature: data.metadata.temperature,
        used_articles: data.metadata.used_articles
      }
    };
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    throw error;
  }
}

export async function updateAISuggestionFeedback(feedback: AIFeedback): Promise<void> {
  const { error } = await supabase
    .from('ai_suggestions')
    .update({
      status: feedback.status,
      feedback: feedback.feedback,
      updated_at: feedback.updated_at
    })
    .eq('id', feedback.suggestion_id);

  if (error) {
    console.error('Error updating AI suggestion feedback:', error);
    throw error;
  }
}

export async function deleteAISuggestion(suggestion_id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_suggestions')
    .delete()
    .eq('id', suggestion_id);

  if (error) {
    console.error('Error deleting AI suggestion:', error);
    throw error;
  }
}
