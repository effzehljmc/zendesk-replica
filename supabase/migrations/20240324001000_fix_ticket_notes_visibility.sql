-- Drop the existing policy
DROP POLICY IF EXISTS "Ticket owners can view public notes and agent responses" ON ticket_notes;

-- Create the fixed policy
CREATE POLICY "Ticket owners can view public notes and agent responses" ON ticket_notes
    FOR SELECT
    TO authenticated
    USING (
        -- Can only view public notes
        visibility = 'public' AND
        -- Must be the ticket owner
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN profiles p ON t.customer_id = p.id
            WHERE t.id = ticket_notes.ticket_id
            AND p.auth_user_id = auth.uid()
        )
    ); 