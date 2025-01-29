-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_ai_suggestion(uuid, text, double precision, jsonb);

-- Recreate with more lenient conditions
CREATE OR REPLACE FUNCTION public.update_ai_suggestion(
    p_suggestion_id uuid,
    p_suggested_response text,
    p_confidence_score double precision,
    p_metadata jsonb
)
RETURNS ai_suggestions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result ai_suggestions;
BEGIN
    UPDATE ai_suggestions 
    SET suggested_response = p_suggested_response,
        confidence_score = p_confidence_score,
        metadata = p_metadata,
        status = 'completed',  -- Set status to completed
        updated_at = NOW()
    WHERE id = p_suggestion_id
    AND status = 'pending'    -- Only check status
    RETURNING *
    INTO result;

    IF result IS NULL THEN
        RAISE EXCEPTION 'No pending suggestion found with id: %', p_suggestion_id;
    END IF;

    RETURN result;
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION update_ai_suggestion IS 'Updates a pending suggestion with actual content and marks it as completed'; 