-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ai_suggestions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ai_suggestions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow system user to insert ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow read access to ai_suggestions" ON ai_suggestions;

-- Create new RLS policies
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Agents can see suggestions for tickets they are assigned to
CREATE POLICY "Agents can view suggestions for assigned tickets" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ai_suggestions.ticket_id
      AND t.assigned_to_id = auth.uid()
    )
  );

-- Customers can see suggestions for their own tickets
CREATE POLICY "Customers can view suggestions for their tickets" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ai_suggestions.ticket_id
      AND t.customer_id = auth.uid()
    )
  );

-- System user can insert suggestions
CREATE POLICY "System user can insert suggestions" ON ai_suggestions
  FOR INSERT
  WITH CHECK (system_user_id = auth.uid());

-- Agents can update suggestions for assigned tickets
CREATE POLICY "Agents can update suggestions for assigned tickets" ON ai_suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ai_suggestions.ticket_id
      AND t.assigned_to_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ai_suggestions.ticket_id
      AND t.assigned_to_id = auth.uid()
    )
  );

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_ticket_id ON ai_suggestions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_system_user_id ON ai_suggestions(system_user_id); 