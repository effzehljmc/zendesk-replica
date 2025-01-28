-- Add system user insert policy
CREATE POLICY "System user can insert suggestions" ON ai_suggestions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = ai_suggestions.system_user_id
      AND p.email = 'ai-system@internal.zendesk-replica.com'
    )
  );

-- Add system user update policy (needed for the Edge Function to update the suggestion)
CREATE POLICY "System user can update suggestions" ON ai_suggestions
  FOR UPDATE
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