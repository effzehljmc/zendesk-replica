-- Get a customer user ID to use for testing
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
  'Test Ticket Creation After Trigger Fix',
  'This is a test ticket to verify the fix',
  'medium',
  'new',
  id
FROM customer_user
RETURNING *; 