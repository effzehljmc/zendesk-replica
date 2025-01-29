-- Enable RLS
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Policy for agents and admins (can see all messages)
CREATE POLICY "Agents and admins can see all messages"
ON ticket_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('agent', 'admin')
  )
);

-- Policy for customers (can only see messages from their tickets)
CREATE POLICY "Customers can see messages from their tickets"
ON ticket_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN user_roles ur ON ur.user_id = auth.uid()
    JOIN roles r ON r.id = ur.role_id
    WHERE t.id = ticket_messages.ticket_id
    AND (
      -- Customer can see their own tickets
      (r.name = 'customer' AND t.customer_id = auth.uid())
      -- Or they are assigned to the ticket
      OR t.assigned_to_id = auth.uid()
    )
  )
);

-- Policy for inserting messages (users can insert messages to tickets they have access to)
CREATE POLICY "Users can insert messages to their tickets"
ON ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    JOIN user_roles ur ON ur.user_id = auth.uid()
    JOIN roles r ON r.id = ur.role_id
    WHERE t.id = ticket_messages.ticket_id
    AND (
      -- Customer can insert to their own tickets
      (r.name = 'customer' AND t.customer_id = auth.uid())
      -- Agents and admins can insert to any ticket
      OR r.name IN ('agent', 'admin')
      -- Or they are assigned to the ticket
      OR t.assigned_to_id = auth.uid()
    )
  )
); 