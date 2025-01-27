-- Check available customer users
SELECT 
    p.id as profile_id,
    p.email,
    r.name as role_name
FROM profiles p
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE r.name = 'customer'
LIMIT 5;

-- Check recent tickets
SELECT 
    t.id as ticket_id,
    t.title,
    t.customer_id,
    p.email as customer_email,
    t.created_at
FROM tickets t
JOIN profiles p ON t.customer_id = p.id
ORDER BY t.created_at DESC
LIMIT 5;

-- Check existing messages for structure
SELECT 
    tm.*,
    p.email as user_email,
    r.name as user_role
FROM ticket_messages tm
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
ORDER BY tm.created_at DESC
LIMIT 5;

-- Now test the trigger with valid data
WITH valid_customer AS (
    SELECT p.id 
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'customer'
    LIMIT 1
),
valid_ticket AS (
    SELECT id 
    FROM tickets 
    ORDER BY created_at DESC 
    LIMIT 1
)
INSERT INTO ticket_messages (
    ticket_id,
    user_id,
    content,
    message_type
) 
SELECT 
    t.id as ticket_id,
    vc.id as user_id,
    'Test message for trigger',
    'user_message'
FROM valid_ticket t, valid_customer vc
RETURNING *;
