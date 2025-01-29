-- Drop the existing function
DROP FUNCTION IF EXISTS public.update_ai_suggestion(uuid, text, double precision, jsonb);

-- Recreate with correct return type
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
        updated_at = NOW()
    WHERE id = p_suggestion_id
    AND suggested_response = 'Processing...'
    AND status = 'pending'
    RETURNING *
    INTO result;

    IF result IS NULL THEN
        RAISE EXCEPTION 'No pending suggestion found with id: %', p_suggestion_id;
    END IF;

    RETURN result;
END;
$$; 