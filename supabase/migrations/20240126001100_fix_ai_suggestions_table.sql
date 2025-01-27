-- First check current structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_suggestions';

-- Add message_id column
ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES ticket_messages(id);

-- Update trigger function to use correct columns
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
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
      status
    ) VALUES (
      NEW.ticket_id,
      NEW.id,
      'pending'
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
END;
$$ LANGUAGE plpgsql;

-- Test the trigger again
INSERT INTO ticket_messages (
    ticket_id,
    user_id,
    content,
    message_type
) VALUES (
    'e19a5598-9299-4958-b020-a446fda22489',
    'f4935274-cb77-43e8-bf9f-757d7ef2b12b',
    'Testing trigger after adding message_id column',
    'user_message'
) RETURNING *;

-- Check if AI suggestion was created
SELECT 
    s.*,
    tm.content as message_content,
    p.email as user_email,
    r.name as user_role
FROM ai_suggestions s
JOIN ticket_messages tm ON s.message_id = tm.id
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE s.created_at > NOW() - INTERVAL '1 minute';
