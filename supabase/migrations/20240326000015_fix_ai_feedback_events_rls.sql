-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ai_feedback_events;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ai_feedback_events;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON ai_feedback_events;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON ai_feedback_events;

-- Create new policies using profile_id relationships
CREATE POLICY "Agents can manage feedback for assigned tickets"
ON ai_feedback_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN profiles p ON t.assigned_to_id = p.id
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE t.id = ai_feedback_events.ticket_id
    AND r.name = 'agent'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN profiles p ON t.assigned_to_id = p.id
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE t.id = ai_feedback_events.ticket_id
    AND r.name = 'agent'
  )
);

CREATE POLICY "Admins can manage all feedback"
ON ai_feedback_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'admin'
  )
);

CREATE POLICY "System user can manage feedback"
ON ai_feedback_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = ai_feedback_events.agent_id
    AND p.email = 'ai-system@internal.zendesk-replica.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = ai_feedback_events.agent_id
    AND p.email = 'ai-system@internal.zendesk-replica.com'
  )
);

-- Add test query to verify policies
NOTIFY test_query, 'SELECT * FROM ai_feedback_events WHERE ticket_id = test_ticket_id;'; 