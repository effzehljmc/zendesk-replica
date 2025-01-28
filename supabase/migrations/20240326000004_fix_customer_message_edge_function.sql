-- Enable http extension if not exists
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Update the trigger function to call Edge Function directly
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
    user_role text;
    system_user_id uuid;
    v_suggestion_id uuid;
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

    -- Debug logging
    RAISE NOTICE 'Processing message: id=%, user_role=%, system_user=%', NEW.id, user_role, system_user_id;

    -- Only notify for customer messages
    IF user_role = 'customer' THEN
        IF system_user_id IS NULL THEN
            RAISE EXCEPTION 'System user not found. Please check ai-system@internal.zendesk-replica.com exists.';
        END IF;

        -- Create AI suggestion request
        INSERT INTO ai_suggestions (
            ticket_id,
            suggested_response,
            confidence_score,
            system_user_id,
            metadata,
            status
        ) VALUES (
            NEW.ticket_id,
            'Processing...', -- Temporary value
            0.0,            -- Initial confidence score
            system_user_id,
            jsonb_build_object(
                'message_id', NEW.id,
                'customer_message', NEW.content,
                'created_at', NEW.created_at
            ),
            'pending'
        ) RETURNING id INTO v_suggestion_id;

        -- Call Edge Function directly
        PERFORM http((
            'POST',
            'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-message-suggestion',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))
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

-- Test the trigger
DO $$
DECLARE
    v_customer_id uuid;
    v_ticket_id uuid;
    v_message_id uuid;
BEGIN
    -- Get a test customer
    SELECT p.id INTO v_customer_id
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = 'customer'
    LIMIT 1;

    -- Get a test ticket
    SELECT id INTO v_ticket_id
    FROM tickets
    WHERE customer_id = v_customer_id
    LIMIT 1;

    -- Insert test message
    INSERT INTO ticket_messages (
        ticket_id,
        user_id,
        content,
        message_type
    ) VALUES (
        v_ticket_id,
        v_customer_id,
        'Test message for Edge Function integration',
        'user_message'
    ) RETURNING id INTO v_message_id;

    -- Verify the result
    RAISE NOTICE 'Created test message with ID: %', v_message_id;
END;
$$;

-- Check results
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
WHERE s.created_at > NOW() - INTERVAL '1 minute'
ORDER BY s.created_at DESC; 