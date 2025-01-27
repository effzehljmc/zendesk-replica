-- Add is_ai_generated column to ticket_messages
ALTER TABLE ticket_messages
ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false;

-- Update existing messages to have is_ai_generated = false
UPDATE ticket_messages
SET is_ai_generated = false
WHERE is_ai_generated IS NULL;
