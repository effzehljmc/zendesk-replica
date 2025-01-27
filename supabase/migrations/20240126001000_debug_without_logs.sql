-- First check the user role
WITH user_info AS (
    SELECT 
        p.id,
        p.email,
        r.name as role
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE p.id = 'f4935274-cb77-43e8-bf9f-757d7ef2b12b'
)
SELECT * FROM user_info;

-- Check ai_suggestions table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ai_suggestions'
ORDER BY ordinal_position;

-- Create a function to help with debugging
CREATE OR REPLACE FUNCTION debug_customer_message(p_user_id uuid)
RETURNS TABLE (
    user_id uuid,
    email text,
    role_name text,
    has_role boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        r.name,
        true
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function with better error handling
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
  user_role text;
  debug_info record;
BEGIN
  -- Get debug info
  SELECT * INTO debug_info 
  FROM debug_customer_message(NEW.user_id);
  
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
EXCEPTION WHEN OTHERS THEN
  INSERT INTO ai_suggestion_errors (
    error_message,
    context,
    created_at
  ) VALUES (
    SQLERRM,
    format('message_id: %s, user_id: %s, role: %s', NEW.id, NEW.user_id, user_role),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create error logging table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_suggestion_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message text,
    context text,
    created_at timestamptz DEFAULT now()
);

-- Test the trigger with a new message
INSERT INTO ticket_messages (
    ticket_id,
    user_id,
    content,
    message_type
) VALUES (
    'e19a5598-9299-4958-b020-a446fda22489',
    'f4935274-cb77-43e8-bf9f-757d7ef2b12b',
    'Testing trigger with error logging',
    'user_message'
) RETURNING *;

-- Check for any errors
SELECT * FROM ai_suggestion_errors 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Check if AI suggestion was created
SELECT * FROM ai_suggestions 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
