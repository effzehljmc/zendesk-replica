-- Drop the problematic policy
DROP POLICY IF EXISTS update_processing_suggestions ON ai_suggestions;

-- Create a new policy that allows updating processing suggestions
CREATE POLICY update_processing_suggestions ON ai_suggestions
    FOR UPDATE
    USING (
        (suggested_response = 'Processing...' AND status = 'pending')
        OR 
        (system_user_id = (SELECT id FROM profiles WHERE email = 'ai-system@internal.zendesk-replica.com'))
    )
    WITH CHECK (true);

-- Add comment explaining the change
COMMENT ON POLICY update_processing_suggestions ON ai_suggestions IS 
    'Allows updating suggestions that are in Processing state or owned by the system user'; 