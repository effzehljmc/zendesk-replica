-- Drop existing policies
DROP POLICY IF EXISTS "Agents can view suggestions for assigned tickets" ON ai_suggestions;
DROP POLICY IF EXISTS "Admins can view all suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "System user can manage suggestions" ON ai_suggestions;

-- Create new RLS policies with correct profile ID handling
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow agents to view suggestions for tickets they are assigned to
CREATE POLICY "Agents can view suggestions for assigned tickets" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN user_roles ur ON ur.user_id = t.assigned_to_id
      JOIN roles r ON r.id = ur.role_id
      WHERE t.id = ai_suggestions.ticket_id
      AND r.name = 'agent'
    )
  );

-- Allow admins to view all suggestions
CREATE POLICY "Admins can view all suggestions" ON ai_suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN user_roles ur ON ur.user_id = t.assigned_to_id
      JOIN roles r ON r.id = ur.role_id
      WHERE t.id = ai_suggestions.ticket_id
      AND r.name = 'admin'
    )
  );

-- Allow system user to manage suggestions
CREATE POLICY "System user can manage suggestions" ON ai_suggestions
  FOR ALL
  USING (system_user_id = (SELECT id FROM profiles WHERE email = 'ai-system@internal.zendesk-replica.com'))
  WITH CHECK (system_user_id = (SELECT id FROM profiles WHERE email = 'ai-system@internal.zendesk-replica.com')); 