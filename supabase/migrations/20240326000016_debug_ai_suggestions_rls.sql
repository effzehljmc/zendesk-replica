-- Create a function to log auth state
CREATE OR REPLACE FUNCTION log_auth_state()
RETURNS trigger AS $$
DECLARE
    v_auth_uid text;
    v_auth_role text;
BEGIN
    -- Get current auth state
    v_auth_uid := auth.uid()::text;
    v_auth_role := auth.role()::text;
    
    -- Log to a debug table
    INSERT INTO auth_debug_logs (
        auth_uid,
        auth_role,
        operation_type,
        table_name,
        triggered_at
    ) VALUES (
        v_auth_uid,
        v_auth_role,
        TG_OP,
        TG_TABLE_NAME::text,
        now()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create debug table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth_debug_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_uid text,
    auth_role text,
    operation_type text,
    table_name text,
    triggered_at timestamp with time zone DEFAULT now()
);

-- Create trigger on ai_suggestions
DROP TRIGGER IF EXISTS tr_log_auth_state ON ai_suggestions;
CREATE TRIGGER tr_log_auth_state
    BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON ai_suggestions
    FOR EACH STATEMENT
    EXECUTE FUNCTION log_auth_state();

-- Add comment
COMMENT ON TABLE auth_debug_logs IS 'Debug table to track auth state during RLS policy evaluation';

-- Grant access to the debug table
GRANT SELECT ON auth_debug_logs TO authenticated; 