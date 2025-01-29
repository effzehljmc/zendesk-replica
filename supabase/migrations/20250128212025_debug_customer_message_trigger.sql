-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION call_edge_function(
    p_message_id uuid,
    p_ticket_id uuid,
    p_suggestion_id uuid,
    p_system_user_id uuid,
    p_service_role_key text
)
RETURNS void AS $$
BEGIN
    -- Small delay to ensure transaction is committed
    PERFORM pg_sleep(0.1);
    
    -- Call Edge Function
    PERFORM http((
        'POST',
        'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-message-suggestion',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || p_service_role_key),
            http_header('Accept', 'application/json')
        ],
        'application/json',
        jsonb_build_object(
            'message_id', p_message_id,
            'ticket_id', p_ticket_id,
            'suggestion_id', p_suggestion_id,
            'system_user_id', p_system_user_id
        )::text
    )::http_request);
EXCEPTION WHEN OTHERS THEN
    -- Log error details
    INSERT INTO debug_logs (operation, entity_id, details)
    VALUES (
        'EDGE_FUNCTION_ERROR',
        p_suggestion_id,
        jsonb_build_object(
            'error', SQLERRM,
            'state', SQLSTATE,
            'timestamp', now()
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to only handle suggestion creation
CREATE OR REPLACE FUNCTION notify_customer_message()
RETURNS trigger AS $$
DECLARE
    user_role text;
    system_user_id uuid;
    v_suggestion_id uuid;
BEGIN
    -- Quick role check
    SELECT r.name INTO user_role
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = NEW.user_id
    LIMIT 1;

    -- Only proceed for customer messages
    IF user_role = 'customer' THEN
        -- Get system user id (for AI) - cached query
        SELECT id INTO system_user_id
        FROM profiles
        WHERE email = 'ai-system@internal.zendesk-replica.com'
        LIMIT 1;

        IF system_user_id IS NULL THEN
            RAISE EXCEPTION 'System user not found';
        END IF;

        -- Create AI suggestion
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

        -- Log suggestion creation
        INSERT INTO debug_logs (operation, entity_id, details)
        VALUES (
            'SUGGESTION_CREATED',
            v_suggestion_id,
            jsonb_build_object(
                'message_id', NEW.id,
                'ticket_id', NEW.ticket_id,
                'suggestion_id', v_suggestion_id,
                'system_user_id', system_user_id,
                'timestamp', now()
            )
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error details
    INSERT INTO debug_logs (operation, entity_id, details)
    VALUES (
        'ERROR',
        CASE WHEN v_suggestion_id IS NOT NULL THEN v_suggestion_id ELSE NULL END,
        jsonb_build_object(
            'error', SQLERRM,
            'state', SQLSTATE,
            'message_id', NEW.id,
            'user_role', user_role,
            'timestamp', now()
        )
    );
    RAISE WARNING 'Error in notify_customer_message: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS after_message_insert ON ticket_messages;
CREATE TRIGGER after_message_insert
    AFTER INSERT ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_message(); 