-- Create priority_suggestions table
CREATE TABLE IF NOT EXISTS priority_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES tickets(id),
    suggested_priority text NOT NULL CHECK (suggested_priority IN ('low', 'medium', 'high')),
    confidence_score real NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    system_user_id uuid REFERENCES profiles(id),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'error'))
);

-- Add RLS policies
ALTER TABLE priority_suggestions ENABLE ROW LEVEL SECURITY;

-- Everyone can read priority suggestions
CREATE POLICY "Everyone can read priority suggestions" 
    ON priority_suggestions FOR SELECT
    USING (true);

-- Only system user can insert priority suggestions
CREATE POLICY "System user can insert priority suggestions" 
    ON priority_suggestions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.email = 'ai-system@internal.zendesk-replica.com'
        )
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_priority_suggestions_ticket_id 
    ON priority_suggestions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_priority_suggestions_system_user_id 
    ON priority_suggestions(system_user_id);

-- Add updated_at trigger using existing function
CREATE TRIGGER set_priority_suggestions_updated_at
    BEFORE UPDATE ON priority_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at(); 