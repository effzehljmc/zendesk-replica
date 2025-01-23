import { supabase } from './supabase';
import { getEmbedding } from './openai';

export type KBArticle = {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  embedding?: number[];
};

export type CreateKBArticleInput = {
  title: string;
  content: string;
  is_public: boolean;
};

export type UpdateKBArticleInput = Partial<CreateKBArticleInput>;

// Get all articles (respects RLS policies)
export async function getKBArticles() {
  const { data, error } = await supabase
    .from('kb_articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as KBArticle[];
}

// Get a single article by ID
export async function getKBArticle(id: string) {
  const { data, error } = await supabase
    .from('kb_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as KBArticle;
}

export async function getSimilarArticles(articleId: string, limit: number = 3) {
  try {
    console.log('Calling getSimilarArticles with:', { articleId, limit });
    
    // Ensure articleId is a valid UUID
    if (!articleId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error('Invalid article ID format');
    }

    const params = {
      _article_id: articleId
    };
    console.log('RPC parameters:', params);

    const response = await supabase.rpc('get_similar_articles', params);
    console.log('Raw Supabase response:', response);

    if (response.error) {
      console.error('Error getting similar articles:', {
        message: response.error.message,
        details: response.error.details,
        hint: response.error.hint,
        code: response.error.code,
        status: response.status,
        statusText: response.statusText
      });
      throw response.error;
    }

    if (!response.data) {
      console.log('No similar articles found');
      return [];
    }

    console.log('Similar articles found:', response.data);
    return response.data as (KBArticle & { similarity: number })[];
  } catch (error) {
    console.error('Error in getSimilarArticles:', error);
    return []; // Return empty array instead of throwing
  }
}

// Create a new article with embedding
export async function createKBArticle(input: CreateKBArticleInput) {
  // Get embedding for the article content
  const embedding = await getEmbedding(input.content);

  const { data, error } = await supabase
    .from('kb_articles')
    .insert([{ ...input, embedding }])
    .select()
    .single();

  if (error) throw error;
  return data as KBArticle;
}

// Update an article
export async function updateKBArticle(id: string, input: UpdateKBArticleInput) {
  const updates: any = { ...input };
  
  // If content is being updated, get new embedding
  if (input.content) {
    updates.embedding = await getEmbedding(input.content);
  }

  const { data, error } = await supabase
    .from('kb_articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as KBArticle;
}

// Delete an article
export async function deleteKBArticle(id: string) {
  const { error } = await supabase
    .from('kb_articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Search articles by similarity
export async function searchKBArticles(query: string, limit?: number) {
  try {
    console.log('Generating embedding for query:', query);
    // Get embedding for the search query
    const embedding = await getEmbedding(query);
    console.log('Generated embedding, calling match_kb_articles');

    const { data, error } = await supabase
      .rpc('match_kb_articles', {
        query_embedding: embedding,
        match_threshold: 0.2,  // Lowered significantly to see if we get any matches
        match_count: limit || 5
      });

    console.log('Search response:', { data, error });

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    return data as KBArticle[];
  } catch (error) {
    console.error('Error in searchKBArticles:', error);
    throw error;
  }
} 