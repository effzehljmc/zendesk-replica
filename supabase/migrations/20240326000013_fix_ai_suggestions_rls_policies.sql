-- Drop existing policies
DROP POLICY IF EXISTS "Agents can view suggestions for assigned tickets" ON ai_suggestions;
DROP POLICY IF EXISTS "Customers can view suggestions for their tickets" ON ai_suggestions;
DROP POLICY IF EXISTS "System user can insert suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Agents can update suggestions for assigned tickets" ON ai_suggestions;

-- Create new RLS policies
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow agents to view suggestions for tickets they are assigned to
CREATE POLICY "Agents can view suggestions for assigned tickets" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN user_roles ur ON ur.user_id = auth.uid()
      JOIN roles r ON r.id = ur.role_id
      WHERE t.id = ai_suggestions.ticket_id
      AND t.assigned_to_id = auth.uid()
      AND r.name = 'agent'
    )
  );

-- Allow admins to view all suggestions
CREATE POLICY "Admins can view all suggestions" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Allow system user to insert and update suggestions
CREATE POLICY "System user can manage suggestions" ON ai_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email = 'ai-system@internal.zendesk-replica.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.email = 'ai-system@internal.zendesk-replica.com'
    )
  );

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_ticket_id ON ai_suggestions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_system_user_id ON ai_suggestions(system_user_id); 