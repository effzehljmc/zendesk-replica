import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateAISuggestion, updateSuggestionStatus, getSuggestions } from '../ai-suggestions';
import { supabase } from '../supabase';
import { match_kb_articles } from '../kb';

// Mock the supabase client
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockTicket, error: null })),
          order: vi.fn(() => ({ data: mockSuggestions, error: null }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockSuggestion, error: null }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null }))
        }))
      }))
    }))
  }
}));

// Mock the KB article matching function
vi.mock('../kb', () => ({
  match_kb_articles: vi.fn(() => Promise.resolve(mockKBArticles))
}));

// Mock data
const mockTicket = {
  id: '123',
  description: 'Test ticket description'
};

const mockKBArticles = [
  { id: 'kb1', title: 'KB Article 1' },
  { id: 'kb2', title: 'KB Article 2' }
];

const mockSuggestion = {
  id: 'sugg1',
  ticketId: '123',
  content: 'AI generated response',
  confidenceScore: 0.8,
  sourceKBArticles: ['kb1', 'kb2'],
  status: 'pending'
};

const mockSuggestions = [mockSuggestion];

// Mock fetch for AI response generation
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      content: 'AI generated response',
      confidence: 0.8,
      relevance: 0.9,
      contextQuality: 0.85
    })
  })
) as any;

describe('AI Suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAISuggestion', () => {
    it('should successfully generate an AI suggestion', async () => {
      const response = await generateAISuggestion('123');
      
      expect(response.success).toBe(true);
      expect(response.suggestion).toBeDefined();
      expect(match_kb_articles).toHaveBeenCalledWith(mockTicket.description);
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock a failure scenario
      vi.mocked(supabase.from).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await generateAISuggestion('123');
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('updateSuggestionStatus', () => {
    it('should successfully update suggestion status', async () => {
      const success = await updateSuggestionStatus({
        suggestionId: 'sugg1',
        status: 'accepted',
        updatedAt: new Date().toISOString()
      });

      expect(success).toBe(true);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for a ticket', async () => {
      const suggestions = await getSuggestions('123');

      expect(suggestions).toEqual(mockSuggestions);
    });
  });
});
