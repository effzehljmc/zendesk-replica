-- Create the similarity search function
CREATE OR REPLACE FUNCTION match_kb_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  is_public boolean,
  author_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.is_public,
    kb.author_id,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM kb_articles kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$; 