-- Drop and recreate the policy with debugging
DO $$ 
BEGIN
    -- Drop the existing policy
    DROP POLICY IF EXISTS "Tags can be created by agents and admins" ON public.tags;
    
    -- Create the policy with debugging
    CREATE POLICY "Tags can be created by agents and admins"
        ON public.tags
        FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                WITH role_check AS (
                    SELECT 
                        p.id as profile_id,
                        p.auth_user_id,
                        r.name as role_name,
                        auth.uid() as current_auth_uid,
                        auth.jwt() as current_jwt,
                        (SELECT CASE 
                            WHEN auth.role() = 'authenticated' THEN true 
                            ELSE false 
                        END) as is_authenticated,
                        (SELECT CASE 
                            WHEN p.auth_user_id = auth.uid()::uuid THEN true 
                            ELSE false 
                        END) as auth_id_matches
                    FROM profiles p
                    INNER JOIN user_roles ur ON ur.user_id = p.id
                    INNER JOIN roles r ON r.id = ur.role_id
                    WHERE p.auth_user_id = auth.uid()::uuid
                )
                SELECT 1 FROM role_check
                WHERE role_name IN ('admin', 'agent')
                AND is_authenticated = true
                AND auth_id_matches = true
            )
            AND created_by_id = (
                SELECT id 
                FROM profiles 
                WHERE auth_user_id = auth.uid()::uuid
            )
        );
END $$; 