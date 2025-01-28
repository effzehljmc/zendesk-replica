-- Update Edge Function to update the Processing suggestion
-- Step 1: Create a function to update suggestions
CREATE OR REPLACE FUNCTION update_ai_suggestion(
    p_suggestion_id UUID,
    p_suggested_response TEXT,
    p_confidence_score FLOAT,
    p_metadata JSONB
) RETURNS SETOF ai_suggestions AS $$
BEGIN
    RETURN QUERY
    UPDATE ai_suggestions 
    SET suggested_response = p_suggested_response,
        confidence_score = p_confidence_score,
        metadata = p_metadata,
        updated_at = NOW()
    WHERE id = p_suggestion_id
    AND suggested_response = 'Processing...'
    AND status = 'pending'
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Add RLS policy to allow the Edge Function to update suggestions
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY update_processing_suggestions ON ai_suggestions
    FOR UPDATE
    USING (suggested_response = 'Processing...' AND status = 'pending')
    WITH CHECK (suggested_response != 'Processing...');

-- Step 3: Add comment explaining the changes
COMMENT ON FUNCTION update_ai_suggestion IS 'Updates a Processing suggestion with actual AI-generated content';
COMMENT ON POLICY update_processing_suggestions ON ai_suggestions IS 'Allows updating Processing suggestions with actual content'; 
