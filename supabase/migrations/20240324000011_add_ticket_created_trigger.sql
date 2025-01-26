-- Enable http extension if not exists
create extension if not exists http;

-- Create function to notify Edge Function
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Call Edge Function via http with anon key (Edge Function will use its own service role key)
  PERFORM
    http((
      'POST',
      'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/on-ticket-created',
      ARRAY[http_header('Authorization', 'Bearer ' || current_setting('request.jwt.claim.role', true))],
      'application/json',
      json_build_object(
        'ticket_id', NEW.id,
        'title', NEW.title,
        'description', NEW.description,
        'status', NEW.status
      )::text
    )::http_request);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS ticket_created_trigger ON tickets;
CREATE TRIGGER ticket_created_trigger
  AFTER INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.status = 'new' AND NEW.assigned_to_id IS NULL)
  EXECUTE FUNCTION notify_ticket_created(); 