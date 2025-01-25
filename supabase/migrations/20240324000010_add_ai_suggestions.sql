-- Add AI suggestion support to ticket_messages
ALTER TABLE ticket_messages
ADD COLUMN IF NOT EXISTS message_type varchar(50) DEFAULT 'user_message' CHECK (message_type IN ('user_message', 'auto_suggestion')),
ADD COLUMN IF NOT EXISTS confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Create a system user for AI suggestions if it doesn't exist and return its ID
CREATE OR REPLACE FUNCTION get_or_create_ai_system_user()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_auth_id uuid;
BEGIN
  -- Try to get existing system user
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'ai-system@internal.zendesk-replica.com'
  LIMIT 1;
  
  -- If not exists, create it
  IF v_user_id IS NULL THEN
    -- First create auth user using Supabase's auth.users() function
    v_auth_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token)
    VALUES
      ('00000000-0000-0000-0000-000000000000', -- instance_id
       v_auth_id, -- id
       'authenticated', -- aud
       'authenticated', -- role
       'ai-system@internal.zendesk-replica.com', -- email
       extensions.crypt('AI_SYSTEM_PLACEHOLDER_PWD', extensions.gen_salt('bf')), -- encrypted_password
       now(), -- email_confirmed_at
       now(), -- created_at
       now(), -- updated_at
       '' -- confirmation_token (empty since email is confirmed)
      );

    -- Then create profile
    INSERT INTO profiles (auth_user_id, email, full_name)
    VALUES (v_auth_id, 'ai-system@internal.zendesk-replica.com', 'AI Assistant')
    RETURNING id INTO v_user_id;
  END IF;
  
  RETURN v_user_id;
END;
$$;

-- Create function to store AI suggestions
CREATE OR REPLACE FUNCTION store_ai_suggestion(
  p_ticket_id uuid,
  p_content text,
  p_confidence_score float,
  p_metadata jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
  v_system_user_id uuid;
BEGIN
  -- Get or create the system user ID
  v_system_user_id := get_or_create_ai_system_user();

  -- Ensure we have a system user
  IF v_system_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to get or create AI system user';
  END IF;

  INSERT INTO ticket_messages (
    ticket_id,
    content,
    message_type,
    confidence_score,
    metadata,
    user_id
  )
  VALUES (
    p_ticket_id,
    p_content,
    'auto_suggestion',
    p_confidence_score,
    p_metadata,
    v_system_user_id
  )
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- Create function to get AI suggestions for a ticket
CREATE OR REPLACE FUNCTION get_ticket_ai_suggestions(
  p_ticket_id uuid,
  p_limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  confidence_score float,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    content,
    confidence_score,
    metadata,
    created_at
  FROM ticket_messages
  WHERE
    ticket_id = p_ticket_id
    AND message_type = 'auto_suggestion'
  ORDER BY
    confidence_score DESC,
    created_at DESC
  LIMIT p_limit;
$$;
