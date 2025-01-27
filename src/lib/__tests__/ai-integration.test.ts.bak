import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../../test/mocks/supabase';
import { match_kb_articles } from '../kb';
import { generateAISuggestion, updateSuggestionStatus } from '../ai-suggestions';
import type { AIMessageSuggestion } from '../../types/ai-suggestion';

describe('AI Backend Integration Tests', () => {
  // Test data
  const testTicket = {
    id: 'test-ticket-1',
    title: 'Test Ticket',
    description: 'How do I reset my password?',
    status: 'new',
    priority: 'medium',
    customerId: 'test-customer-1'
  };

  const testKBArticle = {
    id: 'kb-1',
    title: 'Password Reset Guide',
    content: 'Steps to reset your password...',
    is_public: true,
    author_id: 'system-user'
  };

  beforeAll(async () => {
    // Set up test data
    await supabase.from('tickets').insert([testTicket]);
    await supabase.from('kb_articles').insert([testKBArticle]);
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.from('tickets').delete().eq('id', testTicket.id);
    await supabase.from('kb_articles').delete().eq('id', testKBArticle.id);
    await supabase.from('ai_suggestions').delete().eq('ticketId', testTicket.id);
  });

  it('should successfully match KB articles', async () => {
    const matchedArticles = await match_kb_articles(testTicket.description);
    expect(matchedArticles.length).toBeGreaterThan(0);
    expect(matchedArticles[0].title).toBe('Password Reset Guide');
  });

  it('should generate AI suggestion with matched KB articles', async () => {
    const response = await generateAISuggestion(testTicket.id);
    expect(response.success).toBe(true);
    expect(response.suggestion).toBeDefined();
    
    const suggestion = response.suggestion as AIMessageSuggestion;
    expect(suggestion.ticketId).toBe(testTicket.id);
    expect(suggestion.sourceKBArticles).toContain(testKBArticle.id);
    expect(suggestion.confidenceScore).toBeGreaterThan(0);
  });

  it('should update suggestion status and create ticket message', async () => {
    // First generate a suggestion
    const response = await generateAISuggestion(testTicket.id);
    expect(response.success).toBe(true);
    
    // Then accept it
    const feedback = {
      suggestionId: response.suggestion!.id,
      status: 'accepted' as const,
      updatedAt: new Date().toISOString()
    };

    const updateSuccess = await updateSuggestionStatus(feedback);
    expect(updateSuccess).toBe(true);

    // Verify suggestion status was updated
    const { data: suggestion } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', response.suggestion!.id)
      .single();
    
    expect(suggestion?.status).toBe('accepted');

    // Verify ticket message was created
    const { data: messages } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticketId', testTicket.id)
      .eq('isAIGenerated', true);

    expect(messages?.length).toBe(1);
    expect(messages![0].content).toBe(response.suggestion!.content);
  });

  it('should handle non-existent ticket gracefully', async () => {
    const response = await generateAISuggestion('non-existent-ticket');
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });

  it('should handle concurrent suggestion requests', async () => {
    const requests = Array(3).fill(null).map(() => 
      generateAISuggestion(testTicket.id)
    );

    const responses = await Promise.all(requests);
    
    expect(responses).toHaveLength(3);
    responses.forEach(response => {
      expect(response.success).toBe(true);
      expect(response.suggestion).toBeDefined();
    });

    // Verify suggestions are unique
    const suggestionIds = responses.map(r => r.suggestion!.id);
    const uniqueIds = new Set(suggestionIds);
    expect(uniqueIds.size).toBe(3);
  });
});
