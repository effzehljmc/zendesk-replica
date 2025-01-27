-- First check if system user exists
SELECT * FROM profiles WHERE email = 'ai.system@zendesk-replica.com';

-- Create system user if it doesn't exist
INSERT INTO profiles (
    email,
    full_name,
    auth_user_id -- Using a fixed UUID for the system user
) 
SELECT 
    'ai.system@zendesk-replica.com',
    'AI System',
    '00000000-0000-0000-0000-000000000001'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE email = 'ai.system@zendesk-replica.com'
)
RETURNING *;

-- Make sure system user has agent role
WITH agent_role AS (
    SELECT id FROM roles WHERE name = 'agent'
),
system_user AS (
    SELECT id FROM profiles WHERE email = 'ai.system@zendesk-replica.com'
)
INSERT INTO user_roles (user_id, role_id)
SELECT 
    system_user.id,
    agent_role.id
FROM system_user, agent_role
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN profiles p ON ur.user_id = p.id
    WHERE p.email = 'ai.system@zendesk-replica.com'
);

-- Update trigger function to handle null system user gracefully
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
  user_role text;
  system_user_id uuid;
BEGIN
  -- Get user's role
  SELECT r.name INTO user_role
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  WHERE ur.user_id = NEW.user_id
  LIMIT 1;

  -- Get system user id (for AI)
  SELECT id INTO system_user_id
  FROM profiles
  WHERE email = 'ai.system@zendesk-replica.com'
  LIMIT 1;

  -- Only notify for customer messages
  IF user_role = 'customer' THEN
    IF system_user_id IS NULL THEN
      RAISE EXCEPTION 'System user not found. Please create ai.system@zendesk-replica.com user first.';
    END IF;

    -- Create AI suggestion request
    INSERT INTO ai_suggestions (
      ticket_id,
      suggested_response,
      confidence_score,
      system_user_id,
      metadata
    ) VALUES (
      NEW.ticket_id,
      '', -- Will be filled by Edge Function
      0,  -- Will be filled by Edge Function
      system_user_id,
      jsonb_build_object(
        'message_id', NEW.id,
        'customer_message', NEW.content
      )
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
    'Testing trigger with system user',
    'user_message'
) RETURNING *;

-- Check if AI suggestion was created
SELECT 
    s.*,
    tm.content as message_content,
    p.email as user_email,
    r.name as user_role
FROM ai_suggestions s
JOIN ticket_messages tm ON tm.id = (s.metadata->>'message_id')::uuid
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE s.created_at > NOW() - INTERVAL '1 minute';
