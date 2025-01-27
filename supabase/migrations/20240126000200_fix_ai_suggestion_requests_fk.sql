-- Drop the existing foreign key constraint
ALTER TABLE ai_suggestion_requests
DROP CONSTRAINT IF EXISTS ai_suggestion_requests_message_id_fkey;

-- Re-create the constraint with ON DELETE CASCADE
ALTER TABLE ai_suggestion_requests
ADD CONSTRAINT ai_suggestion_requests_message_id_fkey
FOREIGN KEY (message_id)
REFERENCES ticket_messages(id)
ON DELETE CASCADE;
