-- Disable the old trigger first
DROP TRIGGER IF EXISTS ticket_created_trigger ON tickets;

-- Update the function with the correct service role key
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is a new ticket and not an AI-generated update
  IF (TG_OP = 'INSERT' AND NEW.status = 'new' AND NEW.assigned_to_id IS NULL) THEN
    -- Call Edge Function via http
    PERFORM http(
      (
        'POST',                                                                -- method
        'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/on-ticket-created', -- url
        ARRAY[                                                                -- headers
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcXlkcW1xdW5kYnpuaWVkYmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI3NjMzOSwiZXhwIjoyMDUyODUyMzM5fQ.M96x8QzbEEsegD85uYEg7lmgRTsQIRU6p0CIvlpCKw0')
        ],
        'application/json',                                                   -- content_type
        json_build_object(                                                    -- content
          'ticket_id', NEW.id,
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

-- Create the trigger with specific conditions
CREATE TRIGGER ticket_created_trigger
  AFTER INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.status = 'new' AND NEW.assigned_to_id IS NULL)
  EXECUTE FUNCTION notify_ticket_created(); 