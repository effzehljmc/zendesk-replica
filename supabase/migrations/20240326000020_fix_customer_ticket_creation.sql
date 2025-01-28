-- Drop the incorrect policy
DROP POLICY IF EXISTS "Allow authenticated customers to create tickets" ON tickets;

-- Allow authenticated customers to create tickets using profile_id
CREATE POLICY "Allow authenticated customers to create tickets" ON tickets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Ensure the customer_id matches the current user's profile ID
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON ur.user_id = p.id
            JOIN roles r ON r.id = ur.role_id
            WHERE p.id = customer_id
            AND r.name = 'customer'
        )
    ); 