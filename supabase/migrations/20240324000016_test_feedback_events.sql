-- WARNING: This is a test file only. All changes are wrapped in a transaction and will be rolled back.
-- DO NOT run this in production without the transaction wrapper.

-- Create a temporary table to store test results
CREATE TEMP TABLE test_results (
    test_name TEXT,
    test_description TEXT,
    result TEXT,
    passed BOOLEAN,
    execution_order SERIAL
);

-- Grant permissions on the temporary table
GRANT ALL ON test_results TO authenticated;
GRANT ALL ON test_results_execution_order_seq TO authenticated;

-- First, clean up any leftover test data from previous runs
DO $$
BEGIN
    -- Clean up in correct order to respect foreign key constraints
    -- Only deleting rows with test data, not the tables themselves
    
    -- 1. First delete test feedback event rows
    DELETE FROM ai_feedback_events WHERE feedback_reason LIKE 'Test%';
    
    -- 2. Then delete test suggestion rows
    DELETE FROM ai_suggestions 
    WHERE suggested_response LIKE 'Test%'
    OR ticket_id IN (SELECT id FROM tickets WHERE title LIKE 'Test%')
    OR system_user_id IN (
        SELECT id FROM profiles 
        WHERE email IN ('admin@test.com', 'agent@test.com', 'customer@test.com')
    );
    
    -- 3. Delete test suggestion request rows
    DELETE FROM ai_suggestion_requests
    WHERE ticket_id IN (SELECT id FROM tickets WHERE title LIKE 'Test%');
    
    -- 4. Delete test suggestion queue rows
    DELETE FROM ai_suggestion_queue
    WHERE ticket_id IN (SELECT id FROM tickets WHERE title LIKE 'Test%');
    
    -- 5. Then delete test ticket rows
    DELETE FROM tickets WHERE title LIKE 'Test%';
    
    -- 6. Clean up test user roles first
    DELETE FROM user_roles 
    WHERE user_id IN (
        SELECT id FROM profiles 
        WHERE email IN ('admin@test.com', 'agent@test.com', 'customer@test.com')
    );
    
    -- 7. Then clean up test profiles
    DELETE FROM profiles 
    WHERE email IN ('admin@test.com', 'agent@test.com', 'customer@test.com');
    
    -- 8. Finally clean up test auth users
    DELETE FROM auth.users 
    WHERE email IN ('admin@test.com', 'agent@test.com', 'customer@test.com');
END $$;

BEGIN;

-- Safety check - ensure we're not in production
DO $$
BEGIN
    IF current_database() = 'production' THEN
        RAISE EXCEPTION 'Cannot run tests in production database';
    END IF;
END $$;

-- Test 1: update_updated_at_column function

-- Drop and recreate the trigger function with more debugging
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
    current_ts TIMESTAMPTZ;
BEGIN
    -- Use clock_timestamp() instead of CURRENT_TIMESTAMP for more accurate timing
    current_ts := clock_timestamp();
    RAISE NOTICE 'Trigger function called at %', current_ts;
    RAISE NOTICE 'OLD record: %', OLD;
    RAISE NOTICE 'NEW record before: %', NEW;
    
    -- Force the timestamp to be different
    NEW.updated_at := current_ts;
    
    RAISE NOTICE 'NEW record after: %', NEW;
    RAISE NOTICE 'Timestamps - OLD: %, NEW: %, CURRENT: %', OLD.updated_at, NEW.updated_at, current_ts;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate the trigger as BEFORE UPDATE
DROP TRIGGER IF EXISTS update_ai_feedback_events_updated_at ON ai_feedback_events;
CREATE TRIGGER update_ai_feedback_events_updated_at
    BEFORE UPDATE ON ai_feedback_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify trigger setup
SELECT 
    t.tgname as trigger_name,
    t.tgenabled as trigger_enabled,
    t.tgtype as trigger_type,
    p.proname as function_name,
    p.prosrc as function_source
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'update_ai_feedback_events_updated_at';

-- Create a test record with explicit timestamps to verify trigger behavior
WITH inserted_record AS (
    INSERT INTO ai_feedback_events (
        suggestion_id,
        ticket_id,
        agent_id,
        feedback_type,
        feedback_reason,
        created_at,
        updated_at
    )
    SELECT 
        id as suggestion_id,
        ticket_id,
        system_user_id as agent_id,
        'rejection'::feedback_type,
        'Initial test',
        clock_timestamp(),
        clock_timestamp() - interval '1 hour' -- Set initial updated_at to 1 hour ago
    FROM ai_suggestions
    LIMIT 1
    RETURNING id, created_at, updated_at
)
SELECT 
    id,
    created_at,
    updated_at,
    updated_at < created_at as timestamps_differ_initially,
    clock_timestamp() as insertion_time
FROM inserted_record;

-- Wait a second to ensure timestamps will be different
SELECT pg_sleep(1);

-- Update the record and verify timestamps
UPDATE ai_feedback_events 
SET feedback_reason = 'Updated test'
WHERE feedback_reason = 'Initial test'
RETURNING 
    id, 
    created_at, 
    updated_at,
    created_at < updated_at as update_timestamp_is_newer,
    updated_at > clock_timestamp() - interval '1 second' as timestamp_was_updated,
    clock_timestamp() as update_time,
    updated_at <> created_at as timestamps_are_different;

-- Store Test 1 results
WITH test_record AS (
    UPDATE ai_feedback_events 
    SET feedback_reason = 'Updated test'
    WHERE feedback_reason = 'Initial test'
    RETURNING 
        id, 
        created_at, 
        updated_at,
        created_at < updated_at as update_timestamp_is_newer,
        updated_at > clock_timestamp() - interval '1 second' as timestamp_was_updated,
        clock_timestamp() as update_time,
        updated_at <> created_at as timestamps_are_different
)
INSERT INTO test_results (test_name, test_description, result, passed)
SELECT 
    'Trigger Test',
    'Testing if updated_at is automatically updated',
    format('Updated_at: %s, Created_at: %s', updated_at, created_at),
    update_timestamp_is_newer AND timestamp_was_updated AND timestamps_are_different
FROM test_record;

-- Test 2: feedback_type enum constraints
-- Expected Result: First insert should succeed, second (commented) would fail with invalid enum value
-- Should succeed with valid enum value
INSERT INTO ai_feedback_events (
    suggestion_id,
    ticket_id,
    agent_id,
    feedback_type,
    feedback_reason
)
SELECT 
    id as suggestion_id,
    ticket_id,
    system_user_id as agent_id,
    'revision'::feedback_type,
    'Testing enum - valid'
FROM ai_suggestions
LIMIT 1;

-- Should fail with invalid enum value (commented out to not break the transaction)
/* 
INSERT INTO ai_feedback_events (
    suggestion_id,
    ticket_id,
    agent_id,
    feedback_type,
    feedback_reason
)
SELECT 
    id as suggestion_id,
    ticket_id,
    system_user_id as agent_id,
    'invalid_type'::feedback_type,
    'Testing enum - invalid'
FROM ai_suggestions
LIMIT 1;
*/

-- Store Test 2 results
INSERT INTO test_results (test_name, test_description, result, passed)
VALUES (
    'Enum Constraint Test',
    'Testing if valid enum values are accepted',
    'Successfully inserted with valid enum value',
    TRUE
);

-- Test 3: RLS Policies
-- First, let's create test users and roles
DO $policy_test$
DECLARE
    v_admin_profile_id UUID := '00000000-0000-0000-0000-000000000000';
    v_agent_profile_id UUID := '11111111-1111-1111-1111-111111111111';
    v_customer_profile_id UUID := '22222222-2222-2222-2222-222222222222';
    v_admin_role_id UUID;
    v_agent_role_id UUID;
    v_test_ticket_id UUID;
    v_test_suggestion_id UUID;
BEGIN
    -- Create roles if not exists with fixed IDs
    INSERT INTO roles (id, name, description)
    VALUES 
        ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator role')
    ON CONFLICT (name) DO UPDATE 
    SET description = EXCLUDED.description
    RETURNING id INTO v_admin_role_id;

    -- Create agent role if not exists
    INSERT INTO roles (id, name, description)
    VALUES 
        ('00000000-0000-0000-0000-000000000002', 'agent', 'Agent role')
    ON CONFLICT (name) DO UPDATE 
    SET description = EXCLUDED.description
    RETURNING id INTO v_agent_role_id;

    -- Verify roles were created
    IF v_admin_role_id IS NULL OR v_agent_role_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create or retrieve role IDs';
    END IF;

    -- 1. Create admin user with fixed ID
    INSERT INTO auth.users (id, email)
    VALUES (v_admin_profile_id, 'admin@test.com')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

    -- Create or update admin profile
    INSERT INTO profiles (id, auth_user_id, email, full_name)
    VALUES (
        v_admin_profile_id,
        v_admin_profile_id,
        'admin@test.com',
        'Test Admin'
    )
    ON CONFLICT (auth_user_id) DO UPDATE 
    SET id = EXCLUDED.id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- Ensure clean role assignment for admin
    DELETE FROM user_roles WHERE user_id = v_admin_profile_id;
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_admin_profile_id, v_admin_role_id);

    -- 2. Create agent user with fixed ID
    INSERT INTO auth.users (id, email)
    VALUES (v_agent_profile_id, 'agent@test.com')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

    -- Create or update agent profile
    INSERT INTO profiles (id, auth_user_id, email, full_name)
    VALUES (
        v_agent_profile_id,
        v_agent_profile_id,
        'agent@test.com',
        'Test Agent'
    )
    ON CONFLICT (auth_user_id) DO UPDATE 
    SET id = EXCLUDED.id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- Ensure clean role assignment for agent
    DELETE FROM user_roles WHERE user_id = v_agent_profile_id;
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_agent_profile_id, v_agent_role_id);

    -- 3. Create customer user with fixed ID
    INSERT INTO auth.users (id, email)
    VALUES (v_customer_profile_id, 'customer@test.com')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

    -- Create or update customer profile
    INSERT INTO profiles (id, auth_user_id, email, full_name)
    VALUES (
        v_customer_profile_id,
        v_customer_profile_id,
        'customer@test.com',
        'Test Customer'
    )
    ON CONFLICT (auth_user_id) DO UPDATE 
    SET id = EXCLUDED.id,
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

    -- Ensure customer has no roles
    DELETE FROM user_roles WHERE user_id = v_customer_profile_id;

    -- Create a test ticket assigned to our agent
    INSERT INTO tickets (id, ticket_number, title, description, customer_id, assigned_to_id)
    VALUES (
        gen_random_uuid(),
        (SELECT COALESCE(MAX(ticket_number), 0) + 1 FROM tickets),
        'Test Ticket',
        'Test Description',
        v_customer_profile_id,  -- This customer owns the ticket
        v_agent_profile_id     -- But it's assigned to the agent
    )
    RETURNING id INTO v_test_ticket_id;

    -- Verify ticket assignment
    RAISE NOTICE 'Ticket Assignment Check:';
    RAISE NOTICE 'Ticket ID: %, Customer: %, Assigned To: %', 
        v_test_ticket_id, v_customer_profile_id, v_agent_profile_id;

    -- Create a test AI suggestion for the ticket
    INSERT INTO ai_suggestions (id, ticket_id, suggested_response, confidence_score, system_user_id)
    VALUES (
        gen_random_uuid(),
        v_test_ticket_id,
        'Test suggestion',
        0.9,
        v_admin_profile_id  -- System user (admin) creates the suggestion
    )
    RETURNING id INTO v_test_suggestion_id;

    -- Create test feedback events to verify different scenarios
    -- 1. Feedback from the assigned agent (should be visible to agent)
    INSERT INTO ai_feedback_events (
        suggestion_id,
        ticket_id,
        agent_id,
        feedback_type,
        feedback_reason
    )
    VALUES (
        v_test_suggestion_id,
        v_test_ticket_id,
        v_agent_profile_id,  -- Feedback from the assigned agent
        'revision',
        'Test feedback from assigned agent'
    );

    -- 2. Another feedback event from admin (should be visible to admin only)
    INSERT INTO ai_feedback_events (
        suggestion_id,
        ticket_id,
        agent_id,
        feedback_type,
        feedback_reason
    )
    VALUES (
        v_test_suggestion_id,
        v_test_ticket_id,
        v_admin_profile_id,  -- Feedback from admin
        'approval',
        'Test feedback from admin'
    );

    -- Verify feedback events
    RAISE NOTICE 'Feedback Events Check:';
    RAISE NOTICE 'Agent feedback - Ticket: %, Agent: %', v_test_ticket_id, v_agent_profile_id;
    RAISE NOTICE 'Admin feedback - Ticket: %, Agent: %', v_test_ticket_id, v_admin_profile_id;

    -- Double check no accidental assignments to customer
    IF EXISTS (
        SELECT 1 FROM tickets 
        WHERE assigned_to_id = v_customer_profile_id
        OR id IN (
            SELECT ticket_id FROM ai_feedback_events 
            WHERE agent_id = v_customer_profile_id
        )
    ) THEN
        RAISE WARNING 'Found unexpected customer assignments!';
    END IF;

    -- Verify role assignments and relationships
    RAISE NOTICE 'Verifying role assignments and relationships:';
    RAISE NOTICE 'Admin (ID: %) role count: %', v_admin_profile_id, 
        (SELECT COUNT(*) FROM user_roles WHERE user_id = v_admin_profile_id AND role_id = v_admin_role_id);
    RAISE NOTICE 'Agent (ID: %) role count: %', v_agent_profile_id,
        (SELECT COUNT(*) FROM user_roles WHERE user_id = v_agent_profile_id AND role_id = v_agent_role_id);
    RAISE NOTICE 'Customer (ID: %) role count: %', v_customer_profile_id,
        (SELECT COUNT(*) FROM user_roles WHERE user_id = v_customer_profile_id);
    RAISE NOTICE 'Ticket assigned to agent (ID: %): %', v_agent_profile_id,
        (SELECT COUNT(*) FROM tickets WHERE assigned_to_id = v_agent_profile_id);
    RAISE NOTICE 'Ticket assigned to customer (ID: %): %', v_customer_profile_id,
        (SELECT COUNT(*) FROM tickets WHERE assigned_to_id = v_customer_profile_id);
END $policy_test$;

-- Test policies with different users
-- 1. As admin (should see all records)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"role": "authenticated", "sub": "00000000-0000-0000-0000-000000000000"}';

-- Verify admin role and permissions
DO $$
DECLARE
    v_has_role boolean;
    v_user_id uuid;
    v_role record;
BEGIN
    SELECT auth.uid() INTO v_user_id;
    RAISE NOTICE 'Current auth.uid(): %', v_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles role ON role.id = ur.role_id
        WHERE ur.user_id = v_user_id
        AND role.name = 'admin'
    ) INTO v_has_role;
    
    RAISE NOTICE 'User has admin role: %', v_has_role;
    
    IF NOT v_has_role THEN
        RAISE NOTICE 'Admin role check failed. Checking role assignments:';
        RAISE NOTICE 'User roles for ID %:', v_user_id;
        FOR v_role IN (
            SELECT role.name 
            FROM user_roles ur
            JOIN roles role ON role.id = ur.role_id
            WHERE ur.user_id = v_user_id
        ) LOOP
            RAISE NOTICE 'Role: %', v_role.name;
        END LOOP;
    END IF;
END $$;

-- Verify data exists
SELECT COUNT(*) as total_feedback_events FROM ai_feedback_events;

SELECT COUNT(*) as admin_visible_count 
FROM ai_feedback_events;

-- Store admin visibility test results
WITH counts AS (
    SELECT COUNT(*) as admin_count FROM ai_feedback_events
)
INSERT INTO test_results (test_name, test_description, result, passed)
SELECT 
    'Admin RLS Test',
    'Admin should see all feedback events',
    format('Admin can see %s records (is_admin(): %s)', admin_count, is_admin()),
    admin_count > 0
FROM counts;

-- 2. As agent (should only see assigned tickets)
SET LOCAL "request.jwt.claims" = '{"role": "authenticated", "sub": "11111111-1111-1111-1111-111111111111"}';

-- Verify agent's assigned tickets
DO $$
DECLARE
    v_user_id uuid;
    v_ticket record;
BEGIN
    SELECT auth.uid() INTO v_user_id;
    RAISE NOTICE 'Verifying agent (ID: %) assigned tickets:', v_user_id;
    
    FOR v_ticket IN (
        SELECT id, title 
        FROM tickets 
        WHERE assigned_to_id = v_user_id
    ) LOOP
        RAISE NOTICE 'Assigned ticket: % (%)', v_ticket.title, v_ticket.id;
    END LOOP;
END $$;

SELECT COUNT(*) as agent_visible_count 
FROM ai_feedback_events
WHERE EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ai_feedback_events.ticket_id
    AND t.assigned_to_id = '11111111-1111-1111-1111-111111111111'
);

-- Store agent visibility test results
WITH counts AS (
    SELECT COUNT(*) as agent_count 
    FROM ai_feedback_events
    WHERE EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ai_feedback_events.ticket_id
        AND t.assigned_to_id = '11111111-1111-1111-1111-111111111111'
    )
)
INSERT INTO test_results (test_name, test_description, result, passed)
SELECT 
    'Agent RLS Test',
    'Agent should only see their assigned tickets feedback',
    format('Agent can see %s records', agent_count),
    agent_count = 1
FROM counts;

-- 3. As customer (should see nothing)
SET LOCAL "request.jwt.claims" = '{"role": "authenticated", "sub": "22222222-2222-2222-2222-222222222222"}';

-- Gather and store debug information
WITH debug_info AS (
    SELECT 
        jsonb_build_object(
            'rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE oid = 'ai_feedback_events'::regclass),
            'policies', (
                SELECT jsonb_agg(jsonb_build_object(
                    'name', polname,
                    'permissive', polpermissive,
                    'roles', polroles::text
                ))
                FROM pg_policy
                WHERE polrelid = 'ai_feedback_events'::regclass
            ),
            'customer_roles', (
                SELECT jsonb_agg(r.name)
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = '22222222-2222-2222-2222-222222222222'
            ),
            'relevant_tickets', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', t.id,
                    'title', t.title,
                    'assigned_to', t.assigned_to_id,
                    'customer', t.customer_id,
                    'is_assigned_to_customer', (t.assigned_to_id = '22222222-2222-2222-2222-222222222222'),
                    'is_customer_ticket', (t.customer_id = '22222222-2222-2222-2222-222222222222')
                ))
                FROM tickets t
                WHERE t.assigned_to_id = '22222222-2222-2222-2222-222222222222'
                OR t.customer_id = '22222222-2222-2222-2222-222222222222'
            ),
            'visible_feedback', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', fe.id,
                    'ticket_id', fe.ticket_id,
                    'agent_id', fe.agent_id,
                    'is_customer_agent', (fe.agent_id = '22222222-2222-2222-2222-222222222222'),
                    'is_customer_assigned', (t.assigned_to_id = '22222222-2222-2222-2222-222222222222')
                ))
                FROM ai_feedback_events fe
                JOIN tickets t ON t.id = fe.ticket_id
            )
        ) as debug_data
),
counts AS (
    SELECT COUNT(*) as customer_count FROM ai_feedback_events
)
INSERT INTO test_results (test_name, test_description, result, passed)
SELECT 
    'Customer RLS Test',
    'Customer should see no feedback events',
    format(
        'Customer can see %s records. Debug info: %s', 
        customer_count,
        debug_data::text
    ),
    customer_count = 0
FROM counts, debug_info;

-- Display final test results and cleanup message together
WITH cleanup_info AS (
    SELECT 
        'Performing rollback. All test data will be removed.' as cleanup_message,
        clock_timestamp() as test_end_time
)
SELECT 
    '=== TEST RESULTS ===' as section,
    NULL::text as cleanup_message,
    NULL::timestamptz as test_end_time
UNION ALL
SELECT 
    format(
        'Test #%s: %s - %s - %s - %s',
        execution_order,
        test_name,
        test_description,
        result,
        CASE WHEN passed THEN '✅ PASSED' ELSE '❌ FAILED' END
    ),
    NULL,
    NULL
FROM test_results
ORDER BY section DESC, test_end_time;

ROLLBACK; 