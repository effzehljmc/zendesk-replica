-- Check what triggers currently exist on the tickets table
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

-- Drop any unexpected triggers
DROP TRIGGER IF EXISTS trigger_handle_new_ticket ON public.tickets;
DROP TRIGGER IF EXISTS ticket_created_trigger ON public.tickets;
DROP TRIGGER IF EXISTS after_ticket_insert ON public.tickets;
DROP TRIGGER IF EXISTS trigger_ticket_created ON public.tickets;

-- Drop any old functions that might be causing issues
DROP FUNCTION IF EXISTS public.handle_new_ticket();
DROP FUNCTION IF EXISTS public.notify_ticket_created();
DROP FUNCTION IF EXISTS public.on_ticket_created();

-- Keep only these essential triggers:
-- 1. create_conversation_for_ticket
-- 2. update_resolution_time_trigger

-- Verify final state of triggers
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'tickets'
ORDER BY t.tgname; 