-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_user_id_idx ON ticket_messages(user_id);

-- Enable RLS
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
GRANT ALL ON ticket_messages TO authenticated;

-- RLS Policies

-- Agents and admins can view all messages
CREATE POLICY "Agents and admins can view all messages" ON ticket_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    );

-- Customers can view messages on their own tickets
CREATE POLICY "Customers can view messages on their tickets" ON ticket_messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_messages.ticket_id
            AND t.customer_id IN (
                SELECT id FROM profiles WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Agents and admins can create messages
CREATE POLICY "Agents and admins can create messages" ON ticket_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    );

-- Customers can create messages on their own tickets
CREATE POLICY "Customers can create messages on their tickets" ON ticket_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_messages.ticket_id
            AND t.customer_id IN (
                SELECT id FROM profiles WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Only message creators can update their messages
CREATE POLICY "Users can update their own messages" ON ticket_messages
    FOR UPDATE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- Only message creators and admins can delete messages
CREATE POLICY "Users can delete their own messages" ON ticket_messages
    FOR DELETE
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    ); 