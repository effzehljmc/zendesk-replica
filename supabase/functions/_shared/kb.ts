import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface KBMatch {
  id: string
  title: string
  content: string
  similarity: number
}

export async function matchKBArticles(supabase: SupabaseClient, embedding: number[]) {
  try {
    const { data, error } = await supabase.rpc('match_kb_articles', {
      query_embedding: embedding,
      match_threshold: 0.2,
      match_count: 3
    })

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error matching KB articles:', error);
    return { data: null, error };
  }
}

export async function storeAISuggestion(
  supabase: SupabaseClient,
  ticketId: string,
  match: KBMatch
) {
  try {
    const { error } = await supabase.rpc('store_ai_suggestion', {
      p_ticket_id: ticketId,
      p_content: `Based on our knowledge base, here's the relevant information:\n\n${match.content}`,
      p_confidence_score: match.similarity,
      p_metadata: {
        model: 'kb-match',
        used_articles: [match.title],
        similarity_scores: [match.similarity]
      }
    })

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error storing AI suggestion:', error);
    return { error };
  }
} 