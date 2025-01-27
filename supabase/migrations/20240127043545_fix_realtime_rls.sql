-- Enable RLS on ticket_messages and ai_suggestions if not already enabled
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow realtime updates for ticket_messages
DROP POLICY IF EXISTS "Allow realtime updates for ticket_messages" ON ticket_messages;
CREATE POLICY "Allow realtime updates for ticket_messages" ON ticket_messages
    FOR ALL
    USING (
        -- Allow access if user is authenticated and either:
        -- 1. They are the customer of the ticket
        -- 2. They are the assigned agent
        -- 3. They are an admin
        auth.role() = 'authenticated' AND (
            auth.uid() IN (
                SELECT customer_id::text FROM tickets WHERE id = ticket_messages.ticket_id
                UNION
                SELECT assigned_to_id::text FROM tickets WHERE id = ticket_messages.ticket_id
                UNION
                SELECT p.auth_user_id::text 
                FROM profiles p
                JOIN user_roles ur ON p.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'admin'
            )
        )
    );

-- Allow realtime updates for ai_suggestions
DROP POLICY IF EXISTS "Allow realtime updates for ai_suggestions" ON ai_suggestions;
CREATE POLICY "Allow realtime updates for ai_suggestions" ON ai_suggestions
    FOR ALL
    USING (
        -- Allow access if user is authenticated and either:
        -- 1. They are the assigned agent
        -- 2. They are an admin
        auth.role() = 'authenticated' AND (
            auth.uid() IN (
                SELECT assigned_to_id::text FROM tickets WHERE id = ai_suggestions.ticket_id
                UNION
                SELECT p.auth_user_id::text 
                FROM profiles p
                JOIN user_roles ur ON p.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'admin'
            )
        )
    );
