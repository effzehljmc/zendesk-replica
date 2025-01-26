import type { KBArticle } from '../../types/kb-article';

// Mock KB article matching function
export async function match_kb_articles(query: string): Promise<KBArticle[]> {
  // Return mock KB articles based on the query
  if (query.toLowerCase().includes('password')) {
    return [{
      id: 'kb-1',
      title: 'Password Reset Guide',
      content: 'Steps to reset your password...',
      isPublic: true,
      authorId: 'system-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
  }
  return [];
}
