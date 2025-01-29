-- Drop the old function
DROP FUNCTION IF EXISTS call_edge_function;

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