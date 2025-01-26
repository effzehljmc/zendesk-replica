BEGIN;

-- Create queue table
CREATE TABLE IF NOT EXISTS ai_suggestion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_ticket
    FOREIGN KEY (ticket_id)
    REFERENCES tickets(id)
);

-- Update the notify_ticket_created function
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'new' AND NEW.assigned_to_id IS NULL) THEN
    -- Insert into queue first
    INSERT INTO ai_suggestion_queue (ticket_id)
    VALUES (NEW.id);
    
    -- Then call Edge Function
    PERFORM http(
      (
        'POST',
        'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/on-ticket-created',
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcXlkcW1xdW5kYnpuaWVkYmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI3NjMzOSwiZXhwIjoyMDUyODUyMzM5fQ.M96x8QzbEEsegD85uYEg7lmgRTsQIRU6p0CIvlpCKw0')
        ],
        'application/json',
        json_build_object(
          'id', NEW.id,
          'title', NEW.title,
          'description', NEW.description,
          'status', NEW.status
        )::text
      )::http_request
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger
DROP TRIGGER IF EXISTS ticket_created_trigger ON tickets;
CREATE TRIGGER ticket_created_trigger
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created();

COMMIT; 