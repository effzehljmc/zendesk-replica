-- Check if AI suggestion was created for this message
SELECT 
    s.*,
    tm.content as message_content,
    p.email as user_email,
    r.name as user_role
FROM ai_suggestions s
JOIN ticket_messages tm ON s.ticket_id = tm.ticket_id
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE tm.id = 'aa45f205-1d4d-4c7b-b5ea-8e5eeebcda85';

-- Check if trigger exists and is enabled
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ticket_messages'
AND t.tgname = 'after_message_insert';

-- Let's add more logging to the trigger
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
  user_role text;
  v_debug text;
BEGIN
  -- Get user's role with debug info
  WITH role_info AS (
    SELECT r.name, p.email
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE p.id = NEW.user_id
  )
  SELECT 
    name INTO user_role 
  FROM role_info;
  
  -- Debug logging
  v_debug := format(
    'Processing message: id=%s, user_id=%s, role=%s', 
    NEW.id, 
    NEW.user_id, 
    COALESCE(user_role, 'no role found')
  );
  RAISE NOTICE '%', v_debug;

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
    
    RAISE NOTICE 'Created AI suggestion for message %', NEW.id;
  ELSE
    RAISE NOTICE 'Skipping AI suggestion - user role is %', COALESCE(user_role, 'unknown');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error
  RAISE WARNING 'Error in notify_customer_message: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
