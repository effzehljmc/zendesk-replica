-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete their own messages" ON ticket_messages;

-- Create a new delete policy that properly handles message deletion
CREATE POLICY "Users can delete their own messages" ON ticket_messages
    FOR DELETE
    TO authenticated
    USING (
        -- Message creator can delete their own messages
        (user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
        OR
        -- Ticket owner can delete any message in their ticket
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_messages.ticket_id
            AND t.customer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        )
        OR
        -- Admin can delete any message
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );
