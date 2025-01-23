-- Check total count of articles
SELECT COUNT(*) as total_articles FROM kb_articles;

-- List all articles (without embeddings for readability)
SELECT 
    id,
    title,
    content,
    is_public,
    author_id,
    created_at,
    updated_at
FROM kb_articles
ORDER BY created_at DESC; 