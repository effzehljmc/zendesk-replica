-- Add detailed logging to the trigger function
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    system_user_id uuid;
    v_suggestion_id uuid;
BEGIN
    -- Initial trigger execution log
    RAISE NOTICE 'Trigger executing for message ID: %, Content: %', NEW.id, NEW.content;

    -- Get user's role with logging
    SELECT r.name INTO user_role
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
    LIMIT 1;
    
    RAISE NOTICE 'User role determined: % for user_id: %', COALESCE(user_role, 'none'), NEW.user_id;

    -- Get system user id with logging
    SELECT id INTO system_user_id
    FROM profiles
    WHERE email = 'ai-system@internal.zendesk-replica.com'
    LIMIT 1;
    
    RAISE NOTICE 'System user ID retrieved: %', COALESCE(system_user_id::text, 'not found');

    -- Only notify for customer messages
    IF user_role = 'customer' THEN
        RAISE NOTICE 'Processing customer message. Starting AI suggestion creation...';
        
        IF system_user_id IS NULL THEN
            RAISE EXCEPTION 'System user not found. Please check ai-system@internal.zendesk-replica.com exists.';
        END IF;

        -- Create AI suggestion request with detailed logging
        RAISE NOTICE 'Inserting new AI suggestion for ticket_id: %, message_id: %', NEW.ticket_id, NEW.id;
        
        INSERT INTO ai_suggestions (
            ticket_id,
            message_id,
            suggested_response,
            confidence_score,
            system_user_id,
            metadata,
            status
        ) VALUES (
            NEW.ticket_id,
            NEW.id,
            'Processing...',
            0.0,
            system_user_id,
            jsonb_build_object(
                'customer_message', NEW.content,
                'created_at', NEW.created_at
            ),
            'pending'
        ) RETURNING id INTO v_suggestion_id;
        
        RAISE NOTICE 'Successfully created AI suggestion with ID: % for message: %', v_suggestion_id, NEW.id;

        -- Log Edge Function call attempt
        RAISE NOTICE 'Attempting Edge Function call for suggestion_id: %', v_suggestion_id;

        -- Call Edge Function
        PERFORM http((
            'POST',
            (SELECT value FROM app_settings WHERE key = 'edge_function_url') || '/generate-message-suggestion',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcXlkcW1xdW5kYnpuaWVkYmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzI3NjMzOSwiZXhwIjoyMDUyODUyMzM5fQ.M96x8QzbEEsegD85uYEg7lmgRTsQIRU6p0CIvlpCKw0')
            ],
            'application/json',
            json_build_object(
                'message_id', NEW.id,
                'ticket_id', NEW.ticket_id,
                'suggestion_id', v_suggestion_id,
                'system_user_id', system_user_id
            )::text
        )::http_request);
        
        RAISE NOTICE 'Edge Function call completed for suggestion: %', v_suggestion_id;
    ELSE
        RAISE NOTICE 'Skipping AI suggestion - user role is % (not a customer message)', COALESCE(user_role, 'unknown');
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Detailed error logging
    RAISE WARNING 'Error in notify_customer_message at % line %', SQLSTATE, LINE;
    RAISE WARNING 'Error details: %', SQLERRM;
    RAISE WARNING 'Context: message_id=%, user_role=%, system_user_id=%', 
        NEW.id, COALESCE(user_role, 'unknown'), COALESCE(system_user_id::text, 'not found');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS after_message_insert ON ticket_messages;
CREATE TRIGGER after_message_insert
    AFTER INSERT ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_message(); 