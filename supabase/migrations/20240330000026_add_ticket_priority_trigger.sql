-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION notify_ticket_priority()
RETURNS trigger AS $$
BEGIN
    -- Call Edge Function to evaluate priority
    PERFORM http((
        'POST',
        current_setting('app.settings.edge_function_base_url') || '/evaluate-priority',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
        ],
        'application/json',
        json_build_object(
            'ticket_id', NEW.id
        )::text
    )::http_request);

    -- Log the call
    RAISE NOTICE 'Called evaluate-priority edge function for ticket %', NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS ticket_priority_trigger ON tickets;
CREATE TRIGGER ticket_priority_trigger
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_priority(); 