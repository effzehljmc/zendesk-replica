-- First check the user role to make sure we're using a customer
WITH user_info AS (
    SELECT 
        p.id,
        p.email,
        r.name as role
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE p.id = 'f4935274-cb77-43e8-bf9f-757d7ef2b12b'  -- This is the user_id from your last message
)
SELECT * FROM user_info;

-- Enable more verbose logging
ALTER DATABASE postgres SET log_min_messages TO 'NOTICE';
SET client_min_messages TO 'NOTICE';

-- Test insert with the same user
INSERT INTO ticket_messages (
    ticket_id,
    user_id,
    content,
    message_type
) VALUES (
    'e19a5598-9299-4958-b020-a446fda22489',  -- Using the same ticket_id
    'f4935274-cb77-43e8-bf9f-757d7ef2b12b',  -- Using the same user_id
    'Another test message to check trigger logs',
    'user_message'
) RETURNING *;

-- Check if AI suggestion was created
SELECT 
    s.*,
    tm.content as message_content,
    p.email as user_email,
    r.name as user_role
FROM ai_suggestions s
JOIN ticket_messages tm ON s.message_id = tm.id  -- Changed to join on message_id
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE tm.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY s.created_at DESC;

-- Check the structure of ai_suggestions table
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_suggestions';
