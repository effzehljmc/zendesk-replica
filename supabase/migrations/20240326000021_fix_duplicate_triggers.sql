-- 1. First, just count how many non-constraint triggers exist
SELECT COUNT(*) as trigger_count
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'ticket_messages'
AND t.tgname NOT LIKE 'RI_ConstraintTrigger%';

-- 2. List all non-constraint trigger names
SELECT t.tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'ticket_messages'
AND t.tgname NOT LIKE 'RI_ConstraintTrigger%'
ORDER BY t.tgname;

-- 3. Drop the duplicate trigger and function
DROP TRIGGER IF EXISTS on_message_insert_check_ai ON public.ticket_messages;
DROP FUNCTION IF EXISTS public.handle_suggestion_acceptance();

-- 4. Verify the changes
SELECT t.tgname as remaining_triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'ticket_messages'
AND t.tgname NOT LIKE 'RI_ConstraintTrigger%'
ORDER BY t.tgname; 