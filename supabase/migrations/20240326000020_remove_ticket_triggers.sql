-- Drop ticket-related triggers that generate AI suggestions
DROP TRIGGER IF EXISTS trigger_handle_new_ticket ON public.tickets;
DROP TRIGGER IF EXISTS ticket_created_trigger ON public.tickets;

-- Drop the associated functions that call AI generation
DROP FUNCTION IF EXISTS public.handle_new_ticket();
DROP FUNCTION IF EXISTS public.notify_ticket_created();

-- Keep create_conversation_for_ticket and update_resolution_time_trigger
-- Keep only the customer message trigger (after_message_insert)

-- Verify remaining triggers on tickets table
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'tickets'
ORDER BY t.tgname;

-- Verify customer message trigger exists
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ticket_messages'
AND t.tgname = 'after_message_insert'; 
