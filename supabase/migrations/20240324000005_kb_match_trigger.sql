-- Create a function to handle new tickets
CREATE OR REPLACE FUNCTION handle_new_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if ticket is new/unassigned and has no first response
    IF (NEW.status = 'new' AND NEW.assigned_to_id IS NULL AND NEW.first_response_at IS NULL) THEN
        -- Insert the automated message with system user ID
        INSERT INTO ticket_messages (
            ticket_id,
            content,
            user_id,
            created_at
        ) VALUES (
            NEW.id,
            'Checking for relevant help articles...',
            'd7087860-bf5d-465a-a2d6-d5933ad794b8'::UUID,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_handle_new_ticket ON tickets;
CREATE TRIGGER trigger_handle_new_ticket
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_ticket();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant access to auth schema for the trigger function
GRANT USAGE ON SCHEMA auth TO postgres, authenticated, service_role;
GRANT SELECT ON auth.users TO postgres, authenticated, service_role; 