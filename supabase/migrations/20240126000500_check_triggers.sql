-- Check if trigger exists and is enabled
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled,
    n.nspname as schema_name,
    c.relname as table_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE t.tgname = 'after_message_insert';

-- Check recent messages that should have triggered
SELECT 
    tm.id as message_id,
    tm.content,
    tm.created_at,
    p.email as user_email,
    r.name as user_role
FROM ticket_messages tm
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE tm.created_at > NOW() - INTERVAL '1 hour'
ORDER BY tm.created_at DESC
LIMIT 5;

-- Check if any AI suggestions were generated
SELECT 
    s.*,
    tm.content as triggered_by_message
FROM ai_suggestions s
LEFT JOIN ticket_messages tm ON s.ticket_id = tm.ticket_id
WHERE s.created_at > NOW() - INTERVAL '1 hour'
ORDER BY s.created_at DESC
LIMIT 5;

-- Check Edge Function logs
SELECT 
    id,
    created_at,
    method,
    path,
    status,
    error_message
FROM edge_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;
