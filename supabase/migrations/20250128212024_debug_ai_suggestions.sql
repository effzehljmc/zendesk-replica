-- Temporarily disable RLS
ALTER TABLE ai_suggestions DISABLE ROW LEVEL SECURITY;

-- Check for any triggers that might interfere
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled,
    pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ai_suggestions'
ORDER BY t.tgname;

-- Create a debug log table
CREATE TABLE IF NOT EXISTS debug_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- Add debug trigger on ai_suggestions
CREATE OR REPLACE FUNCTION log_ai_suggestions_changes()
RETURNS trigger AS $$
BEGIN
    INSERT INTO debug_logs (operation, entity_id, details)
    VALUES (
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW),
            'timestamp', now()
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_suggestions_debug_trigger
AFTER INSERT OR UPDATE OR DELETE ON ai_suggestions
FOR EACH ROW
EXECUTE FUNCTION log_ai_suggestions_changes(); 