-- Check if our tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'ai_suggestions'
);

-- Check our triggers
SELECT tgname, tgtype, proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'tickets'::regclass;

-- Test creating a new ticket to see if triggers work
WITH profile AS (
  SELECT id FROM profiles LIMIT 1
)
INSERT INTO tickets (
  title,
  description,
  status,
  priority,
  customer_id,
  ticket_number
) VALUES (
  'How do I reset my password?',
  'I forgot my password and need to reset it. Can you help?',
  'new',
  'medium',
  (SELECT id FROM profile),
  (SELECT COALESCE(MAX(ticket_number), 0) + 1 FROM tickets)
) RETURNING id;

-- Check if any suggestions were generated
SELECT 
  id,
  ticket_id,
  suggested_response,
  confidence_score,
  system_user_id,
  metadata,
  created_at,
  updated_at
FROM ai_suggestions
ORDER BY created_at DESC
LIMIT 5;
