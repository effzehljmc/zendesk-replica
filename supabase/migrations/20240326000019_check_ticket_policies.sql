-- Check existing policies on tickets table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tickets';

-- Check table constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'tickets'::regclass;

-- Check table permissions
SELECT 
    grantee, 
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'tickets';

-- Check all users and their roles with auth_user_id
SELECT 
    p.id as profile_id,
    p.auth_user_id,
    p.email,
    p.full_name,
    array_agg(r.name) as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN roles r ON r.id = ur.role_id
GROUP BY p.id, p.auth_user_id, p.email, p.full_name;

-- Check table definition and sequences
SELECT 
    column_name,
    column_default,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'tickets'; 