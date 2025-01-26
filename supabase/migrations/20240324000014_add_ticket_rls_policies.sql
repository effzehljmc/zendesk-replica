-- Enable RLS on the tickets table if not already enabled
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users to read tickets
DROP POLICY IF EXISTS "Allow anon and authenticated read tickets" ON tickets;
CREATE POLICY "Allow anon and authenticated read tickets" ON tickets
    FOR SELECT
    USING (true);

-- Allow anon to create tickets (needed for the Edge Function)
DROP POLICY IF EXISTS "Allow anon create tickets" ON tickets;
CREATE POLICY "Allow anon create tickets" ON tickets
    FOR INSERT
    WITH CHECK (true);

-- Allow anon to call the Edge Function
DROP POLICY IF EXISTS "Allow anon invoke Edge Functions" ON tickets;
CREATE POLICY "Allow anon invoke Edge Functions" ON tickets
    FOR ALL
    USING (auth.role() = 'anon');

-- Allow the AI system user to update tickets
DROP POLICY IF EXISTS "Allow AI system to update tickets" ON tickets;
CREATE POLICY "Allow AI system to update tickets" ON tickets
    FOR UPDATE
    USING (auth.uid() = (SELECT auth_user_id FROM profiles WHERE email = 'ai-system@internal.zendesk-replica.com')::uuid)
    WITH CHECK (auth.uid() = (SELECT auth_user_id FROM profiles WHERE email = 'ai-system@internal.zendesk-replica.com')::uuid); 