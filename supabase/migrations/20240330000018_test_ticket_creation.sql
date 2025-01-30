-- First get a customer user ID to use
WITH customer_user AS (
  SELECT p.id 
  FROM profiles p
  JOIN user_roles ur ON p.id = ur.user_id
  JOIN roles r ON ur.role_id = r.id
  WHERE r.name = 'customer'
  LIMIT 1
)
-- Try to create a test ticket
INSERT INTO tickets (
  title,
  description,
  priority,
  status,
  customer_id
)
SELECT 
  'Test Ticket Creation',
  'This is a test ticket to verify basic creation functionality',
  'medium',
  'new',
  id
FROM customer_user
RETURNING *;

-- Check if the ticket was created and get related info
SELECT 
  t.*,
  p.email as customer_email,
  p.full_name as customer_name,
  EXISTS (
    SELECT 1 
    FROM ticket_messages 
    WHERE ticket_id = t.id
  ) as has_messages,
  EXISTS (
    SELECT 1 
    FROM ai_suggestions 
    WHERE ticket_id = t.id
  ) as has_ai_suggestions
FROM tickets t
JOIN profiles p ON t.customer_id = p.id
WHERE t.created_at > NOW() - INTERVAL '1 minute'
ORDER BY t.created_at DESC;

-- Check triggers on tickets table
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  t.tgenabled as enabled,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'tickets'
ORDER BY t.tgname; 