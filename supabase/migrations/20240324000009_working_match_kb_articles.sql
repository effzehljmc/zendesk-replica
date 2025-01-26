-- Drop existing functions
DROP FUNCTION IF EXISTS match_kb_articles(text, float, int);
DROP FUNCTION IF EXISTS match_kb_articles(text, float, int, text);
DROP FUNCTION IF EXISTS match_kb_articles(text, text, float, int);
DROP FUNCTION IF EXISTS match_kb_articles_test(text, text, float, int);

-- Enable http extension if not exists
create extension if not exists http;

-- Create the production version
create or replace function match_kb_articles(
  query_text text,
  match_threshold float default 0.5,
  match_count int default 3,
  service_role_key text default null
)
returns table (
  id uuid,
  title varchar(255),
  content text,
  is_public boolean,
  author_id uuid,
  created_at timestamp,
  updated_at timestamp,
  similarity float
)
language plpgsql
security definer
as $$
declare
  query_embedding vector(1536);
  embedding_response json;
  http_response http_response;
  auth_key text;
begin
  -- Determine which key to use
  auth_key := COALESCE(
    service_role_key, 
    current_setting('request.jwt.claim.service_role', true)
  );

  -- Call the Edge Function to get the embedding
  SELECT * INTO http_response
  FROM http((
    'POST',
    'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-embedding',
    ARRAY[http_header('Authorization', 'Bearer ' || auth_key)],
    'application/json',
    json_build_object('text', query_text)::text
  )::http_request);

  -- Parse the response
  embedding_response := http_response.content::json;

  -- Extract the embedding from the response
  query_embedding := (embedding_response->>'embedding')::vector;

  -- Return matching articles
  return query
  select
    ka.id,
    ka.title,
    ka.content,
    ka.is_public,
    ka.author_id,
    ka.created_at,
    ka.updated_at,
    1 - (ka.embedding <=> query_embedding) as similarity
  from kb_articles ka
  where 1 - (ka.embedding <=> query_embedding) >= match_threshold
  order by ka.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Add comment
comment on function match_kb_articles(text, float, int, text) is 
  'Matches knowledge base articles using semantic search. Parameters:
   - query_text: The text to match against
   - match_threshold: Minimum similarity score (0-1) required to include an article
   - match_count: Maximum number of articles to return
   - service_role_key: Optional service role key to use instead of JWT claim';

-- Example usage (commented out):
/*
select * from match_kb_articles(
  'How do I export my data?',
  0.5,
  3
);
*/
