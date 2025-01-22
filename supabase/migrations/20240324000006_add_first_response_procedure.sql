-- Drop the existing function first
DROP FUNCTION IF EXISTS create_ticket_note(uuid,text,uuid,boolean,text);

-- Create a function to handle note creation and first response time update
CREATE OR REPLACE FUNCTION create_ticket_note(
  p_ticket_id UUID,
  p_content TEXT,
  p_created_by_id UUID,
  p_is_agent_or_admin BOOLEAN,
  p_visibility TEXT DEFAULT 'private'
) RETURNS SETOF ticket_notes LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_note_id UUID;
BEGIN
  -- First, create the note
  INSERT INTO ticket_notes (
    ticket_id,
    content,
    visibility,
    created_by_id
  ) VALUES (
    p_ticket_id,
    p_content,
    p_visibility,
    p_created_by_id
  )
  RETURNING id INTO v_note_id;

  -- If this is an agent/admin and it's their first note on this ticket,
  -- update the first_response_at if it's not already set
  IF p_is_agent_or_admin THEN
    UPDATE tickets
    SET first_response_at = NOW()
    WHERE id = p_ticket_id
    AND first_response_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM ticket_notes
      WHERE ticket_id = p_ticket_id
      AND created_by_id = p_created_by_id
      AND id != v_note_id
    );
  END IF;

  -- Return the created note
  RETURN QUERY
  SELECT *
  FROM ticket_notes
  WHERE id = v_note_id;
END;
$$; 