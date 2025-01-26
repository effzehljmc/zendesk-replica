import { supabase } from './supabase';
import type { AIMessageSuggestion, CreateAISuggestionData, AIGenerationResponse, AIFeedback } from '../types/ai-suggestion';
import { match_kb_articles } from './kb';

export async function generateAISuggestion(ticketId: string): Promise<AIGenerationResponse> {
  try {
    // 1. Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw new Error(`Failed to fetch ticket: ${ticketError.message}`);
    if (!ticket) throw new Error('Ticket not found');

    // 2. Get relevant KB articles
    const relevantArticles = await match_kb_articles(ticket.description);
    
    // 3. Call the Edge Function to generate AI response
    const { data: suggestion, error: suggestionError } = await supabase.functions.invoke(
      'on-ticket-created',
      {
        body: {
          ticket_id: ticketId,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status
        }
      }
    );

    if (suggestionError) {
      throw new Error(`Failed to generate AI response: ${suggestionError.message}`);
    }

    return {
      success: true,
      suggestion: suggestion as AIMessageSuggestion
    };

  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function updateSuggestionStatus(feedback: AIFeedback): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_suggestions')
      .update({
        status: feedback.status,
        updatedAt: new Date().toISOString()
      })
      .eq('id', feedback.suggestionId);

    if (error) throw error;

    // If suggestion was accepted, create a ticket message
    if (feedback.status === 'accepted') {
      const { data: suggestion } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('id', feedback.suggestionId)
        .single();

      if (suggestion) {
        await supabase
          .from('ticket_messages')
          .insert([{
            ticketId: suggestion.ticketId,
            content: suggestion.content,
            userId: suggestion.userId, // This should be the system user ID
            isAIGenerated: true
          }]);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating suggestion status:', error);
    return false;
  }
}

export async function getSuggestions(ticketId: string): Promise<AIMessageSuggestion[]> {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .select('*')
    .eq('ticketId', ticketId)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }

  return data as AIMessageSuggestion[];
}
