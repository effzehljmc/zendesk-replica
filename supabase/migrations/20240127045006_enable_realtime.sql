-- Enable real-time for specific tables
alter publication supabase_realtime add table ticket_messages;
alter publication supabase_realtime add table ai_suggestions;

-- Enable replication on the tables
ALTER TABLE ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE ai_suggestions REPLICA IDENTITY FULL;

-- Verify real-time is enabled
DO $$
DECLARE
    table_count integer;
BEGIN
    SELECT COUNT(*)
    INTO table_count
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('ticket_messages', 'ai_suggestions');

    IF table_count < 2 THEN
        RAISE EXCEPTION 'Real-time not enabled for all required tables';
    END IF;
END $$;
