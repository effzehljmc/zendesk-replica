-- Drop existing policies
DROP POLICY IF EXISTS "Allow system user to insert ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Allow read access to ai_suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ai_suggestions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ai_suggestions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON ai_suggestions;

-- Create new policies using profile_id relationships
CREATE POLICY "Agents can view suggestions for assigned tickets"
ON ai_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN profiles p ON t.assigned_to_id = p.id
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE t.id = ai_suggestions.ticket_id
    AND r.name = 'agent'
  )
);

CREATE POLICY "Admins can view all suggestions"
ON ai_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'admin'
  )
);

CREATE POLICY "System user can manage suggestions"
ON ai_suggestions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = ai_suggestions.system_user_id
    AND p.email = 'ai-system@internal.zendesk-replica.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = ai_suggestions.system_user_id
    AND p.email = 'ai-system@internal.zendesk-replica.com'
  )
);

-- Add test query to verify policies
NOTIFY test_query, 'SELECT * FROM ai_suggestions WHERE ticket_id = test_ticket_id;'; 