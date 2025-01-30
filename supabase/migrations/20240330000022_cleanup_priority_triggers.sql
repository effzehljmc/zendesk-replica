-- Drop any triggers related to priority evaluation
DROP TRIGGER IF EXISTS evaluate_priority_trigger ON public.tickets;
DROP TRIGGER IF EXISTS after_ticket_insert ON public.tickets;
DROP TRIGGER IF EXISTS on_new_ticket ON public.tickets;
DROP TRIGGER IF EXISTS ticket_created_trigger ON public.tickets;
DROP TRIGGER IF EXISTS trigger_ticket_created ON public.tickets;

-- Drop any related functions
DROP FUNCTION IF EXISTS public.evaluate_ticket_priority();
DROP FUNCTION IF EXISTS public.handle_new_ticket();
DROP FUNCTION IF EXISTS public.notify_ticket_created();
DROP FUNCTION IF EXISTS public.on_ticket_created();

-- Keep only these essential triggers:
-- 1. create_conversation_for_ticket - Creates the initial conversation for a new ticket
-- 2. update_resolution_time_trigger - Updates resolution time when a ticket is resolved

-- Verify remaining triggers
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'tickets'
AND t.tgname NOT LIKE 'RI_ConstraintTrigger%'
ORDER BY t.tgname; 