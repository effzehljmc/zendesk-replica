-- Drop the old function if it exists
drop function if exists match_kb_articles(text, float, int);

-- Create the new function that uses the Edge Function
create or replace function match_kb_articles(
  query_text text,
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
begin
  -- Call the Edge Function to get the embedding
  select
    content::json into embedding_response
  from
    http((
      'POST',
      current_setting('app.settings.supabase_functions_endpoint') || '/generate-embedding',
      ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))],
      'application/json',
      json_build_object('text', query_text)::text
    )::http_request);

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
