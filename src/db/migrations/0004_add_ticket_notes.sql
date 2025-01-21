-- Drop existing policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Agents and admins can view all notes" ON ticket_notes;
    DROP POLICY IF EXISTS "Customers can only view public notes on their tickets" ON ticket_notes;
    DROP POLICY IF EXISTS "Agents and admins can create notes" ON ticket_notes;
    DROP POLICY IF EXISTS "Agents and admins can update their own notes" ON ticket_notes;
    DROP POLICY IF EXISTS "Agents and admins can delete their own notes" ON ticket_notes;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Drop table if exists
DROP TABLE IF EXISTS "ticket_notes";

-- Create ticket_notes table
CREATE TABLE "ticket_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "visibility" text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team', 'public')),
  "created_by_id" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ticket_notes_ticket_id_idx ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_notes_created_by_id_idx ON ticket_notes(created_by_id);

-- Add RLS policies
ALTER TABLE ticket_notes ENABLE ROW LEVEL SECURITY;

-- View policies
CREATE POLICY "Agents and admins can view all notes" ON ticket_notes
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    );

CREATE POLICY "Customers can only view public notes on their tickets" ON ticket_notes
    FOR SELECT
    TO authenticated
    USING (
        visibility = 'public' AND
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_notes.ticket_id
            AND t.customer_id = auth.uid()
        )
    );

-- Insert policy
CREATE POLICY "Agents and admins can create notes" ON ticket_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    );

-- Update policy
CREATE POLICY "Agents and admins can update their own notes" ON ticket_notes
    FOR UPDATE
    TO authenticated
    USING (
        created_by_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    )
    WITH CHECK (
        created_by_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    );

-- Delete policy
CREATE POLICY "Agents and admins can delete their own notes" ON ticket_notes
    FOR DELETE
    TO authenticated
    USING (
        created_by_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    ); 