import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useAISuggestions } from '../useAISuggestions';
import { generateAISuggestion, updateSuggestionStatus, getSuggestions } from '../../lib/ai-suggestions';

// Mock the AI suggestion functions
vi.mock('../../lib/ai-suggestions', () => ({
  generateAISuggestion: vi.fn(),
  updateSuggestionStatus: vi.fn(),
  getSuggestions: vi.fn()
}));

const mockSuggestion = {
  id: 'sugg1',
  ticketId: '123',
  content: 'AI generated response',
  confidenceScore: 0.8,
  sourceKBArticles: ['kb1', 'kb2'],
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('useAISuggestions', () => {
  it('should load suggestions on mount', async () => {
    vi.mocked(getSuggestions).mockResolvedValueOnce([mockSuggestion]);

    const { result, waitForNextUpdate } = renderHook(() =>
      useAISuggestions('123')
    );

    await waitForNextUpdate();

    expect(getSuggestions).toHaveBeenCalledWith('123');
    expect(result.current.suggestions).toEqual([mockSuggestion]);
  });

  it('should generate new suggestion', async () => {
    vi.mocked(generateAISuggestion).mockResolvedValueOnce({
      success: true,
      suggestion: mockSuggestion
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useAISuggestions('123')
    );

    act(() => {
      result.current.generateSuggestion();
    });

    await waitForNextUpdate();

    expect(generateAISuggestion).toHaveBeenCalledWith('123');
    expect(result.current.suggestions).toContainEqual(mockSuggestion);
  });

  it('should handle generation errors', async () => {
    vi.mocked(generateAISuggestion).mockResolvedValueOnce({
      success: false,
      error: 'Generation failed'
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useAISuggestions('123')
    );

    act(() => {
      result.current.generateSuggestion();
    });

    await waitForNextUpdate();

    expect(result.current.error).toBe('Generation failed');
  });

  it('should provide feedback on suggestions', async () => {
    vi.mocked(updateSuggestionStatus).mockResolvedValueOnce(true);
    vi.mocked(getSuggestions).mockResolvedValueOnce([mockSuggestion]);

    const { result, waitForNextUpdate } = renderHook(() =>
      useAISuggestions('123')
    );

    await waitForNextUpdate();

    const feedback = {
      suggestionId: 'sugg1',
      status: 'accepted' as const,
      updatedAt: new Date().toISOString()
    };

    await act(async () => {
      await result.current.provideFeedback(feedback);
    });

    expect(updateSuggestionStatus).toHaveBeenCalledWith(feedback);
    expect(result.current.suggestions[0].status).toBe('accepted');
  });

  it('should refresh suggestions', async () => {
    const updatedSuggestion = { ...mockSuggestion, status: 'accepted' };
    vi.mocked(getSuggestions)
      .mockResolvedValueOnce([mockSuggestion])
      .mockResolvedValueOnce([updatedSuggestion]);

    const { result, waitForNextUpdate } = renderHook(() =>
      useAISuggestions('123')
    );

    await waitForNextUpdate();

    act(() => {
      result.current.refreshSuggestions();
    });

    await waitForNextUpdate();

    expect(getSuggestions).toHaveBeenCalledTimes(2);
    expect(result.current.suggestions[0]).toEqual(updatedSuggestion);
  });
});
