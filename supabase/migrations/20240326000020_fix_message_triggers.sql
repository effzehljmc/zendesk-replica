-- Drop the duplicate trigger and function
DROP TRIGGER IF EXISTS on_new_customer_message ON ticket_messages;
DROP FUNCTION IF EXISTS handle_new_customer_message();

-- Keep only the after_message_insert trigger
-- Verify only one trigger exists
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ticket_messages'
ORDER BY t.tgname; 