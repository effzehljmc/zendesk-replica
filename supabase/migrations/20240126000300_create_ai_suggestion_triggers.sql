-- Create notification functions
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS trigger AS $$
BEGIN
  -- Notify about new ticket
  PERFORM pg_notify(
    'new_ticket_created',
    json_build_object(
      'ticket_id', NEW.id,
      'title', NEW.title,
      'description', NEW.description,
      'customer_id', NEW.customer_id,
      'created_at', NEW.created_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
  customer_role_id uuid;
BEGIN
  -- Get customer role id
  SELECT id INTO customer_role_id 
  FROM roles 
  WHERE name = 'customer' 
  LIMIT 1;

  -- Only notify for customer messages
  IF EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = NEW.user_id 
    AND role_id = customer_role_id
  ) THEN
    PERFORM pg_notify(
      'new_customer_message',
      json_build_object(
        'message_id', NEW.id,
        'ticket_id', NEW.ticket_id,
        'content', NEW.content,
        'user_id', NEW.user_id,
        'created_at', NEW.created_at
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS after_ticket_insert ON tickets;
CREATE TRIGGER after_ticket_insert
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_created();

DROP TRIGGER IF EXISTS after_message_insert ON ticket_messages;
CREATE TRIGGER after_message_insert
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_message();

-- Add comment
COMMENT ON FUNCTION notify_ticket_created IS 'Notifies Edge Function when a new ticket is created';
COMMENT ON FUNCTION notify_customer_message IS 'Notifies Edge Function when a customer sends a new message';

-- Test the triggers
DO $$ 
BEGIN
  -- Verify functions exist
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_ticket_created') THEN
    RAISE EXCEPTION 'notify_ticket_created function does not exist';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_customer_message') THEN
    RAISE EXCEPTION 'notify_customer_message function does not exist';
  END IF;

  -- Verify triggers exist
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'after_ticket_insert'
  ) THEN
    RAISE EXCEPTION 'after_ticket_insert trigger does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'after_message_insert'
  ) THEN
    RAISE EXCEPTION 'after_message_insert trigger does not exist';
  END IF;
END $$;
