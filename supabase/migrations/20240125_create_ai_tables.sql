-- Create AI suggestion queue table
CREATE TABLE IF NOT EXISTS ai_suggestion_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid REFERENCES tickets(id) NOT NULL,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create AI suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid REFERENCES tickets(id) NOT NULL,
  suggested_response text NOT NULL,
  confidence_score float CHECK (confidence_score >= 0 AND confidence_score <= 1),
  system_user_id uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_queue_ticket_id ON ai_suggestion_queue(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_queue_status ON ai_suggestion_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_ticket_id ON ai_suggestions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_system_user_id ON ai_suggestions(system_user_id);

-- Create trigger function for ticket creation
CREATE OR REPLACE FUNCTION on_ticket_created()
RETURNS TRIGGER AS $$
DECLARE
  v_edge_function_url text := 'https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-response';
  v_service_role_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  -- We'll use pg_notify to trigger the Edge Function
  -- This allows us to keep the async nature of the original implementation
  PERFORM pg_notify('new_ticket', json_build_object(
    'ticket_id', NEW.id,
    'title', NEW.title,
    'description', NEW.description,
    'edge_function_url', v_edge_function_url,
    'service_role_key', v_service_role_key
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_ticket_created ON tickets;
CREATE TRIGGER trigger_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION on_ticket_created();

-- Add RLS policies
ALTER TABLE ai_suggestion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS read_ai_suggestion_queue ON ai_suggestion_queue;
DROP POLICY IF EXISTS read_ai_suggestions ON ai_suggestions;
DROP POLICY IF EXISTS insert_ai_suggestion_queue ON ai_suggestion_queue;
DROP POLICY IF EXISTS update_ai_suggestion_queue ON ai_suggestion_queue;
DROP POLICY IF EXISTS insert_ai_suggestions ON ai_suggestions;
DROP POLICY IF EXISTS update_ai_suggestions ON ai_suggestions;

-- Allow read access to authenticated users
CREATE POLICY read_ai_suggestion_queue ON ai_suggestion_queue
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY read_ai_suggestions ON ai_suggestions
  FOR SELECT TO authenticated
  USING (true);

-- Allow insert/update access to service role only
CREATE POLICY insert_ai_suggestion_queue ON ai_suggestion_queue
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY update_ai_suggestion_queue ON ai_suggestion_queue
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY insert_ai_suggestions ON ai_suggestions
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY update_ai_suggestions ON ai_suggestions
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
