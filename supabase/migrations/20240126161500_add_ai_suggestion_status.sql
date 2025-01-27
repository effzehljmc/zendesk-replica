ALTER TABLE ai_suggestions
ADD COLUMN status text NOT NULL DEFAULT 'pending',
ADD COLUMN feedback text;
