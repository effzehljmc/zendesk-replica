-- Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
    current_ts TIMESTAMPTZ;
BEGIN
    -- Use clock_timestamp() instead of CURRENT_TIMESTAMP for more accurate timing
    current_ts := clock_timestamp();
    NEW.updated_at := current_ts;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create enum for feedback types if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feedback_type') THEN
        CREATE TYPE feedback_type AS ENUM ('rejection', 'revision', 'approval');
    END IF;
END $$;

-- Create the ai_feedback_events table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ai_feedback_events') THEN
        CREATE TABLE ai_feedback_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            suggestion_id UUID NOT NULL REFERENCES ai_suggestions(id),
            ticket_id UUID NOT NULL REFERENCES tickets(id),
            agent_id UUID NOT NULL REFERENCES profiles(id),
            feedback_type feedback_type NOT NULL,
            agent_response TEXT,
            feedback_reason TEXT,
            time_to_feedback INTERVAL, -- Time between suggestion creation and feedback
            metadata JSONB DEFAULT '{}', -- Keeping metadata for consistency and future analytics
            created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
        );

        -- Add RLS policies
        ALTER TABLE ai_feedback_events ENABLE ROW LEVEL SECURITY;

        -- Create trigger to update updated_at
        CREATE TRIGGER update_ai_feedback_events_updated_at
            BEFORE UPDATE ON ai_feedback_events
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Helper function to check if user is admin (recreate to ensure latest version)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    );
END;
$$ language plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
    -- Drop ALL existing policies to ensure a clean slate
    DROP POLICY IF EXISTS "Admins and assigned agents can view feedback events" ON ai_feedback_events;
    DROP POLICY IF EXISTS "Admins and assigned agents can create feedback events" ON ai_feedback_events;
    DROP POLICY IF EXISTS "Admins can update feedback events" ON ai_feedback_events;
    DROP POLICY IF EXISTS "Admins can delete feedback events" ON ai_feedback_events;
    DROP POLICY IF EXISTS "Agents can create feedback events" ON ai_feedback_events;
    DROP POLICY IF EXISTS "Users can view feedback events for tickets they have access to" ON ai_feedback_events;
END $$;

-- First ensure RLS is enabled
ALTER TABLE ai_feedback_events ENABLE ROW LEVEL SECURITY;

-- Then create the policies with explicit RESTRICTIVE qualifier
CREATE POLICY "Admins and assigned agents can view feedback events"
    ON ai_feedback_events
    FOR SELECT
    USING (
        -- Only allow access if user is admin or the assigned agent
        (
            -- Admin check
            is_admin()
        ) OR (
            -- Agent check - must satisfy ALL conditions:
            -- 1. User must be assigned to the ticket
            -- 2. User must have agent role
            -- 3. User must not be the customer
            -- 4. User must be the agent who created the feedback
            EXISTS (
                SELECT 1 FROM tickets t
                WHERE t.id = ai_feedback_events.ticket_id
                AND t.assigned_to_id = auth.uid()
                AND t.assigned_to_id <> t.customer_id
                AND ai_feedback_events.agent_id = auth.uid()
                AND EXISTS (
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = auth.uid()
                    AND r.name = 'agent'
                )
            )
        )
    );

CREATE POLICY "Admins and assigned agents can create feedback events"
    ON ai_feedback_events
    FOR INSERT
    WITH CHECK (
        is_admin() OR
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_id
            AND t.assigned_to_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = auth.uid()
                AND r.name = 'agent'
            )
        )
    );

CREATE POLICY "Admins can update feedback events"
    ON ai_feedback_events
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete feedback events"
    ON ai_feedback_events
    FOR DELETE
    USING (is_admin()); 