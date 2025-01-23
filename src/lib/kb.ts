import { supabase } from './supabase';
import { generateEmbedding } from './openai';

export type KBArticle = {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  author_id: string;
  embedding?: number[];
  created_at: string;
  updated_at: string;
};

export type CreateKBArticleInput = Pick<KBArticle, 'title' | 'content' | 'is_public'>;
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

// Create a new article with embedding
export async function createKBArticle(input: CreateKBArticleInput) {
  // Generate embedding from title and content
  const embedding = await generateEmbedding(`${input.title}\n\n${input.content}`);

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
  
  // Only regenerate embedding if title or content changed
  if (input.title || input.content) {
    // Get current article to combine with updates
    const current = await getKBArticle(id);
    const newTitle = input.title || current.title;
    const newContent = input.content || current.content;
    
    updates.embedding = await generateEmbedding(`${newTitle}\n\n${newContent}`);
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
export async function searchKBArticles(query: string, limit: number = 5) {
  // Generate embedding for the search query
  const embedding = await generateEmbedding(query);

  // Search using vector similarity
  const { data, error } = await supabase
    .rpc('match_kb_articles', {
      query_embedding: embedding,
      match_threshold: 0.5, // Adjust this threshold as needed
      match_count: limit
    });

  if (error) throw error;
  return data as KBArticle[];
} 