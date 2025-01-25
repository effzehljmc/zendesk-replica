-- Enable http extension if not exists
create extension if not exists http;

-- Update the match_kb_articles function with fixed column reference
create or replace function match_kb_articles(
  query_text text,
  service_role_key text,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  is_public boolean,
  author_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  similarity float
)
language plpgsql
security definer
as $$
declare
  query_embedding vector(1536);
  embedding_response json;
  http_response http_response;
begin
  -- Call the Edge Function to get the embedding
  SELECT * INTO http_response
  FROM http((
    'POST',
    'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-embedding',
    ARRAY[http_header('Authorization', 'Bearer ' || service_role_key)],
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
  where 
    ka.is_public = true
    and 1 - (ka.embedding <=> query_embedding) > match_threshold
  order by ka.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Example usage (commented out, run manually):
/*
select * from match_kb_articles(
  'How do I export my data?',
  'your-service-role-key',
  0.7,
  3
);
*/
