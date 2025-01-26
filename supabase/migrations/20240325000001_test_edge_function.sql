-- Test Edge Function Components
-- Step 1: Clear previous test data
DELETE FROM ticket_messages 
WHERE ticket_id = '40c86de0-a9db-4892-9017-338597114cf5'
  AND message_type = 'auto_suggestion';

-- Step 2: Verify system user
SELECT id, email, full_name
FROM profiles
WHERE email = 'ai-system@internal.zendesk-replica.com';

-- Step 3: Test match_kb_articles for the test ticket
SELECT * FROM match_kb_articles(
  query_text := 'test test',
  match_threshold := 0.5,
  match_count := 3
);

-- Step 4: Test storing a suggestion manually
SELECT store_ai_suggestion(
  p_ticket_id := '40c86de0-a9db-4892-9017-338597114cf5',
  p_content := E'This is a test response',
  p_confidence_score := 0.85,
  p_metadata := '{"model": "gpt-4", "used_articles": ["test-article"]}'::jsonb
);

-- Step 5: Verify results
SELECT id, ticket_id, message_type, confidence_score, metadata::text
FROM ticket_messages
WHERE ticket_id = '40c86de0-a9db-4892-9017-338597114cf5'
  AND message_type = 'auto_suggestion'
ORDER BY created_at DESC
LIMIT 1;
