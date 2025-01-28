-- First ensure we have the http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Update the trigger function with proper auth
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    system_user_id uuid;
    v_suggestion_id uuid;
    service_role_key text;
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
    WHERE email = 'ai-system@internal.zendesk-replica.com'
    LIMIT 1;

    -- Get service role key from app_settings
    SELECT value INTO service_role_key
    FROM app_settings
    WHERE key = 'service_role_key';

    IF service_role_key IS NULL THEN
        RAISE EXCEPTION 'Service role key not found in app_settings';
    END IF;

    -- Debug logging
    RAISE NOTICE 'Processing message: id=%, user_role=%, system_user=%, has_key=%', 
        NEW.id, user_role, system_user_id, service_role_key IS NOT NULL;

    -- Only notify for customer messages
    IF user_role = 'customer' THEN
        IF system_user_id IS NULL THEN
            RAISE EXCEPTION 'System user not found. Please check ai-system@internal.zendesk-replica.com exists.';
        END IF;

        -- Create AI suggestion request
        INSERT INTO ai_suggestions (
            ticket_id,
            message_id,           -- Store direct reference
            suggested_response,
            confidence_score,
            system_user_id,
            metadata,
            status
        ) VALUES (
            NEW.ticket_id,
            NEW.id,              -- Direct message_id reference
            'Processing...',     -- Temporary value
            0.0,                 -- Initial confidence score
            system_user_id,
            jsonb_build_object(
                'customer_message', NEW.content,
                'created_at', NEW.created_at
            ),
            'pending'
        ) RETURNING id INTO v_suggestion_id;

        -- Call Edge Function directly with explicit service role key
        PERFORM http((
            'POST',
            'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-message-suggestion',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || service_role_key)
            ],
            'application/json',
            json_build_object(
                'message_id', NEW.id,
                'ticket_id', NEW.ticket_id,
                'suggestion_id', v_suggestion_id,
                'system_user_id', system_user_id
            )::text
        )::http_request);

        RAISE NOTICE 'Created AI suggestion % and called Edge Function for message %', v_suggestion_id, NEW.id;
    ELSE
        RAISE NOTICE 'Skipping AI suggestion - user role is %', COALESCE(user_role, 'unknown');
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in notify_customer_message: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS after_message_insert ON ticket_messages;
CREATE TRIGGER after_message_insert
    AFTER INSERT ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_message(); 