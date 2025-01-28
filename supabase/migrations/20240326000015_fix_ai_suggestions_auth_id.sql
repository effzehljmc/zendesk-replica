-- Drop existing policies
DROP POLICY IF EXISTS "Agents can view suggestions for assigned tickets" ON ai_suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "System user can manage suggestions" ON ai_suggestions;

-- Create new RLS policies with correct auth.uid() handling
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow agents to view suggestions for tickets they are assigned to
CREATE POLICY "Agents can view suggestions for assigned tickets" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN profiles p ON p.auth_user_id = auth.uid()
      JOIN user_roles ur ON ur.user_id = p.id
      JOIN roles r ON r.id = ur.role_id
      WHERE t.id = ai_suggestions.ticket_id
      AND t.assigned_to_id = p.id
      AND r.name = 'agent'
    )
  );

-- Allow admins to view all suggestions
CREATE POLICY "Admins can view all suggestions" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      JOIN roles r ON r.id = ur.role_id
      WHERE p.auth_user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Allow system user to manage suggestions
CREATE POLICY "System user can manage suggestions" ON ai_suggestions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.email = 'ai-system@internal.zendesk-replica.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.email = 'ai-system@internal.zendesk-replica.com'
    )
  ); 