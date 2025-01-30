-- Update the notify_ticket_created function to remove evaluate-priority call
CREATE OR REPLACE FUNCTION public.notify_ticket_created()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'new' AND NEW.assigned_to_id IS NULL) THEN
    -- Insert into queue first
    INSERT INTO ai_suggestion_queue (ticket_id)
    VALUES (NEW.id);
    
    -- Call on-ticket-created Edge Function
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
$function$; 