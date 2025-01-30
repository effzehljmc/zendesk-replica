-- Create a table to store test logs
DROP TABLE IF EXISTS test_logs;
CREATE TEMP TABLE test_logs (
    id SERIAL PRIMARY KEY,
    timestamp timestamptz DEFAULT now(),
    step text,
    details jsonb
);

-- Update the trigger function to log to our temp table
CREATE OR REPLACE FUNCTION notify_ticket_priority()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_response http_response;
    v_service_role_key text;
BEGIN
    -- Get service role key from settings
    SELECT value->>'key' INTO v_service_role_key
    FROM settings
    WHERE key = 'supabase_service_role_key';

    -- Verify service role key exists
    IF v_service_role_key IS NULL THEN
        INSERT INTO test_logs (step, details) VALUES (
            'Service Role Key Error',
            jsonb_build_object(
                'error', 'Service role key not found in settings table',
                'ticket_id', NEW.id
            )
        );
        RAISE EXCEPTION 'Service role key not found in settings table';
    END IF;

    -- Log trigger execution
    INSERT INTO test_logs (step, details) VALUES (
        'Trigger Started',
        jsonb_build_object(
            'ticket_id', NEW.id,
            'title', NEW.title,
            'description', substring(NEW.description, 1, 50) || '...'
        )
    );

    -- Call Edge Function with logging
    BEGIN
        -- Set statement timeout to 10 seconds
        SET LOCAL statement_timeout = '10s';
        
        -- Call the edge function
        SELECT * INTO v_response FROM http((
            'POST',
            'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/evaluate-priority',
            ARRAY[
                http_header('Content-Type', 'application/json'),
                http_header('Authorization', 'Bearer ' || v_service_role_key),
                http_header('Accept', 'application/json')
            ],
            'application/json',
            jsonb_build_object(
                'ticket_id', NEW.id,
                'title', NEW.title,
                'description', NEW.description
            )::text
        )::http_request);

        -- Log response
        INSERT INTO test_logs (step, details) VALUES (
            'Edge Function Response',
            jsonb_build_object(
                'status', v_response.status,
                'body', convert_from(v_response.content, 'UTF-8'),
                'headers', v_response.headers
            )
        );

    EXCEPTION 
        WHEN query_canceled THEN
            INSERT INTO test_logs (step, details) VALUES (
                'Edge Function Timeout',
                jsonb_build_object(
                    'error', 'Request timed out after 10 seconds',
                    'ticket_id', NEW.id
                )
            );
        WHEN OTHERS THEN
            INSERT INTO test_logs (step, details) VALUES (
                'Edge Function Error',
                jsonb_build_object(
                    'error', SQLERRM,
                    'ticket_id', NEW.id,
                    'state', SQLSTATE
                )
            );
    END;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_logs (step, details) VALUES (
        'Trigger Error',
        jsonb_build_object(
            'error', SQLERRM,
            'state', SQLSTATE,
            'ticket_id', NEW.id,
            'title', NEW.title
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS ticket_priority_trigger ON tickets;
CREATE TRIGGER ticket_priority_trigger
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_priority();

-- Create a function to test and return results
CREATE OR REPLACE FUNCTION test_priority_trigger()
RETURNS TABLE (
    test_step text,
    result jsonb
) AS $$
DECLARE
    v_ticket_id uuid;
    v_ticket_number int;
BEGIN
    -- Clear previous test logs
    TRUNCATE test_logs;
    
    -- Get the next ticket number
    SELECT COALESCE(MAX(ticket_number), 0) + 1 INTO v_ticket_number FROM tickets;
    
    -- Insert test ticket
    INSERT INTO tickets (
        ticket_number,
        title,
        description,
        customer_id
    ) VALUES (
        v_ticket_number,
        'Test Priority Trigger Logging',
        'This is a test ticket to verify the priority trigger logging is working correctly. The customer is reporting a critical system issue that needs immediate attention.',
        'f4935274-cb77-43e8-bf9f-757d7ef2b12b'  -- Lukas Customer profile ID
    ) RETURNING id INTO v_ticket_id;
    
    -- Wait a bit for the trigger to complete
    PERFORM pg_sleep(2);
    
    -- Return all logs and results
    RETURN QUERY
    (
        -- First get all the logs
        SELECT 
            step::text,
            details::jsonb
        FROM test_logs
        
        UNION ALL
        
        -- Then get the created ticket
        SELECT 
            'Created Ticket'::text,
            to_jsonb(t.*)
        FROM tickets t
        WHERE id = v_ticket_id
        
        UNION ALL
        
        -- Finally get the priority suggestion if it exists
        SELECT 
            'Priority Suggestion'::text,
            to_jsonb(ps.*)
        FROM priority_suggestions ps
        WHERE ticket_id = v_ticket_id
        
        ORDER BY 1 -- Order by the step name
    );
END;
$$ LANGUAGE plpgsql;

-- Run the test and show results
SELECT * FROM test_priority_trigger();