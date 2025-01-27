-- Create a temporary table to capture notifications
CREATE TEMPORARY TABLE IF NOT EXISTS test_notifications (
    channel text,
    payload text,
    received_at timestamptz DEFAULT now()
);

-- Create a function to capture notifications
CREATE OR REPLACE FUNCTION capture_notification() RETURNS event_trigger AS $$
BEGIN
    INSERT INTO test_notifications (channel, payload)
    VALUES (TG_EVENT, current_query());
END;
$$ LANGUAGE plpgsql;

-- Enable listening to notifications
LISTEN new_ticket_created;
LISTEN new_customer_message;

-- Test ticket trigger
WITH new_ticket AS (
  INSERT INTO tickets (
    ticket_number,
    title,
    description,
    customer_id,
    status,
    priority
  ) VALUES (
    1001,
    'Test Ticket',
    'This is a test ticket description',
    (SELECT id FROM profiles LIMIT 1), -- Get first profile as customer
    'new',
    'medium'
  ) RETURNING id
)
SELECT id FROM new_ticket;

-- Test message trigger
INSERT INTO ticket_messages (
  ticket_id,
  user_id,
  content
) VALUES (
  (SELECT id FROM tickets WHERE title = 'Test Ticket'),
  (SELECT customer_id FROM tickets WHERE title = 'Test Ticket'),
  'This is a test message from customer'
);

-- Wait a moment for notifications to be processed
SELECT pg_sleep(1);

-- Check if triggers are properly set up
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN ('after_ticket_insert', 'after_message_insert');

-- Cleanup test data in correct order
DO $$ 
DECLARE
    test_ticket_id uuid;
BEGIN
    -- Get the test ticket id
    SELECT id INTO test_ticket_id FROM tickets WHERE title = 'Test Ticket';
    
    -- Delete related records first
    DELETE FROM ai_suggestion_requests WHERE ticket_id = test_ticket_id;
    DELETE FROM ticket_messages WHERE ticket_id = test_ticket_id;
    DELETE FROM tickets WHERE id = test_ticket_id;
END $$;

-- Cleanup temporary objects
DROP FUNCTION IF EXISTS capture_notification();
DROP TABLE IF EXISTS test_notifications;
