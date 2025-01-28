-- First ensure table has all required columns
ALTER TABLE ai_suggestions 
ADD COLUMN IF NOT EXISTS suggested_response text,
ADD COLUMN IF NOT EXISTS confidence_score real,
ADD COLUMN IF NOT EXISTS system_user_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES ticket_messages(id);

-- Update trigger to handle both old and new schema
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

        -- Notify about new message (keep this for backward compatibility)
        PERFORM pg_notify(
            'new_customer_message',
            json_build_object(
                'message_id', NEW.id,
                'ticket_id', NEW.ticket_id,
                'content', NEW.content,
                'user_id', NEW.user_id,
                'created_at', NEW.created_at,
                'suggestion_id', v_suggestion_id,
                'system_user_id', system_user_id
            )::text
        );

        RAISE NOTICE 'Created AI suggestion % for message %', v_suggestion_id, NEW.id;
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

-- Ensure trigger is properly set
DROP TRIGGER IF EXISTS after_message_insert ON ticket_messages;
CREATE TRIGGER after_message_insert
    AFTER INSERT ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_customer_message();

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
        'Test message for schema sync',
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
JOIN ticket_messages tm ON tm.id = s.message_id  -- Use direct reference
JOIN profiles p ON tm.user_id = p.id
JOIN user_roles ur ON p.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE s.created_at > NOW() - INTERVAL '1 minute'
ORDER BY s.created_at DESC; 