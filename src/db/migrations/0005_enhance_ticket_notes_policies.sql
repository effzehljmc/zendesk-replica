-- Begin transaction
BEGIN;

-- Set search path
SET search_path TO public;

-- Verify required tables and columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ticket_notes'
    ) THEN
        RAISE EXCEPTION 'ticket_notes table not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles'
    ) THEN
        RAISE EXCEPTION 'profiles table not found';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_roles'
    ) THEN
        RAISE EXCEPTION 'user_roles table not found';
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE ticket_notes TO authenticated;
GRANT SELECT ON TABLE profiles TO authenticated;
GRANT SELECT ON TABLE user_roles TO authenticated;
GRANT SELECT ON TABLE roles TO authenticated;
GRANT SELECT ON TABLE tickets TO authenticated;

-- Drop ALL existing policies
DO $$ 
DECLARE
    pol record;
BEGIN
    -- First disable RLS to avoid any issues
    ALTER TABLE ticket_notes DISABLE ROW LEVEL SECURITY;
    
    -- Drop all policies using dynamic SQL
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'ticket_notes'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON ticket_notes', pol.policyname);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Re-enable RLS
ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;

-- View policies with granular access based on visibility and roles
CREATE POLICY "Admins can view all notes" ON ticket_notes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

CREATE POLICY "Agents can view all non-private notes and their own private notes" ON ticket_notes
    FOR SELECT
    TO authenticated
    USING (
        (
            -- Can view their own private notes
            (visibility = 'private' AND created_by_id IN (
                SELECT id FROM profiles WHERE auth_user_id = auth.uid()
            )) OR
            -- Can view team and public notes
            visibility IN ('team', 'public')
        ) AND
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'agent'
        )
    );

CREATE POLICY "Ticket owners can view public notes and agent responses" ON ticket_notes
    FOR SELECT
    TO authenticated
    USING (
        (
            -- Can view public notes
            visibility = 'public' OR
            -- Can view team/private notes if they're the ticket owner
            EXISTS (
                SELECT 1 FROM tickets t
                JOIN profiles p ON t.customer_id = p.id
                WHERE t.id = ticket_notes.ticket_id
                AND p.auth_user_id = auth.uid()
            )
        )
    );

-- Insert policies
CREATE POLICY "Agents and admins can create notes" ON ticket_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (
            -- Verify user is admin or agent
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN user_roles ur ON p.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE p.auth_user_id = auth.uid()
                AND r.name IN ('admin', 'agent')
            )
        ) AND (
            -- Ensure created_by_id matches the current user's profile ID
            created_by_id IN (
                SELECT id FROM profiles WHERE auth_user_id = auth.uid()
            )
        ) AND (
            -- Verify the ticket exists
            EXISTS (
                SELECT 1 FROM tickets WHERE id = ticket_id
            )
        )
    );

-- Update policies
CREATE POLICY "Admins can update any note" ON ticket_notes
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

CREATE POLICY "Agents can update their own notes" ON ticket_notes
    FOR UPDATE
    TO authenticated
    USING (
        created_by_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'agent'
        )
    )
    WITH CHECK (
        created_by_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'agent'
        )
    );

-- Delete policies
CREATE POLICY "Admins can delete any note" ON ticket_notes
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'admin'
        )
    );

CREATE POLICY "Agents can delete their own notes" ON ticket_notes
    FOR DELETE
    TO authenticated
    USING (
        created_by_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles ur ON p.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'agent'
        )
    );

-- Commit transaction
COMMIT; 