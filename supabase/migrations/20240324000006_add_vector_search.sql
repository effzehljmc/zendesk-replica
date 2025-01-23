-- Enable the pgvector extension
create extension if not exists vector;

-- Add embedding column to kb_articles
alter table kb_articles 
add column if not exists embedding vector(1536);

-- Create a function to update embeddings
create or replace function update_kb_article_embedding()
returns trigger
language plpgsql
as $$
declare
  embedding vector(1536);
begin
  -- Get embedding from OpenAI (this will be handled by our backend)
  new.embedding := new.embedding;
  
  return new;
end;
$$;

-- Create a trigger to update embeddings on insert or update
drop trigger if exists kb_article_embedding_trigger on kb_articles;
create trigger kb_article_embedding_trigger
  before insert or update on kb_articles
  for each row
  execute function update_kb_article_embedding();

-- Create an index for faster similarity searches
create index if not exists kb_articles_embedding_idx 
  on kb_articles 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Function to find similar articles
create or replace function get_similar_articles(
  _article_id uuid,
  _match_count int DEFAULT 3
)
returns table (
  id uuid,
  title text,
  content text,
  is_public boolean,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ka.id,
    ka.title,
    ka.content,
    ka.is_public,
    1 - (
      ka.embedding <=> (
        SELECT kb.embedding
        FROM kb_articles kb
        WHERE kb.id = _article_id
      )
    ) as similarity
  from kb_articles ka
  where 
    ka.id != _article_id
    and ka.is_public = true
  order by ka.embedding <=> (
    SELECT kb2.embedding
    FROM kb_articles kb2
    WHERE kb2.id = _article_id
  )
  limit _match_count;
end;
$$; 