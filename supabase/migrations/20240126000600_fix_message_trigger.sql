-- First check if the trigger exists
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled,
    t.tgtype as trigger_type,
    t.tgdeferrable as deferrable,
    t.tginitdeferred as init_deferred
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ticket_messages'
AND t.tgname = 'after_message_insert';

-- Drop and recreate the trigger with better error handling
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
  customer_role_id uuid;
  user_role text;
BEGIN
  -- Get user's role
  SELECT r.name INTO user_role
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = NEW.user_id
  LIMIT 1;

  -- Only notify for customer messages
  IF user_role = 'customer' THEN
    -- Create AI suggestion request
    INSERT INTO ai_suggestions (
      ticket_id,
      message_id,
      status,
      created_at
    ) VALUES (
      NEW.ticket_id,
      NEW.id,
      'pending',
      NOW()
    );

    -- Notify about new message
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
EXCEPTION WHEN OTHERS THEN
  -- Log error
  RAISE NOTICE 'Error in notify_customer_message: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS after_message_insert ON ticket_messages;
CREATE TRIGGER after_message_insert
  AFTER INSERT ON ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_message();

-- Test the trigger
INSERT INTO ticket_messages (
  ticket_id,
  user_id,
  content
) VALUES (
  (SELECT id FROM tickets ORDER BY created_at DESC LIMIT 1),
  (SELECT id FROM profiles WHERE email LIKE '%customer%' LIMIT 1),
  'Test message for trigger'
) RETURNING *;

-- Check if AI suggestion was created
SELECT * FROM ai_suggestions 
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;
