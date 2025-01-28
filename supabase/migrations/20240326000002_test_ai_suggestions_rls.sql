-- Ensure we're not in production
DO $$ 
BEGIN
    IF current_database() = 'production' THEN
        RAISE EXCEPTION 'Cannot run tests in production database';
    END IF;
END $$;

-- Clean up any leftover test data
DO $$
BEGIN
    -- Clean up in correct order to respect foreign key constraints
    DELETE FROM ai_feedback_events WHERE feedback_reason LIKE 'Test RLS%';
    DELETE FROM ai_suggestions WHERE suggested_response LIKE 'Test RLS%';
    DELETE FROM tickets WHERE title LIKE 'Test RLS%';
END $$;

-- Create temp table for test results
CREATE TEMP TABLE test_results (
    test_name TEXT,
    test_description TEXT,
    result TEXT,
    error_message TEXT DEFAULT NULL,
    debug_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create test schema for auth mock
CREATE SCHEMA IF NOT EXISTS mock_auth;

-- Create mock auth.uid() function
CREATE OR REPLACE FUNCTION mock_auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT nullif(current_setting('app.current_user_id', TRUE), '')::uuid;
$$;

-- Helper function to check visibility
CREATE OR REPLACE FUNCTION check_suggestion_visibility(p_user_id UUID, p_suggestion_ids UUID[])
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public, mock_auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Set the user ID in our custom setting
    PERFORM set_config('app.current_user_id', p_user_id::text, true);
    
    SELECT COUNT(*) INTO v_count 
    FROM ai_suggestions 
    WHERE id = ANY(p_suggestion_ids);
    
    -- Clear the setting
    PERFORM set_config('app.current_user_id', '', true);
    RETURN v_count;
END;
$$;

-- Helper function to try system insert
CREATE OR REPLACE FUNCTION try_system_insert(
    p_system_user_id UUID,
    p_ticket_id UUID,
    p_suggested_response TEXT,
    p_confidence_score FLOAT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, mock_auth
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set the user ID in our custom setting
    PERFORM set_config('app.current_user_id', p_system_user_id::text, true);
    
    INSERT INTO ai_suggestions (
        ticket_id,
        suggested_response,
        confidence_score,
        system_user_id,
        status
    ) VALUES (
        p_ticket_id,
        p_suggested_response,
        p_confidence_score,
        p_system_user_id,
        'pending'
    );
    
    -- Clear the setting
    PERFORM set_config('app.current_user_id', '', true);
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Clear the setting
    PERFORM set_config('app.current_user_id', '', true);
    RETURN FALSE;
END;
$$;

-- Helper function to try agent update
CREATE OR REPLACE FUNCTION try_agent_update(
    p_agent_id UUID,
    p_suggestion_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, mock_auth
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set the user ID in our custom setting
    PERFORM set_config('app.current_user_id', p_agent_id::text, true);
    
    UPDATE ai_suggestions 
    SET status = 'accepted' 
    WHERE id = p_suggestion_id;
    
    -- Clear the setting
    PERFORM set_config('app.current_user_id', '', true);
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- Clear the setting
    PERFORM set_config('app.current_user_id', '', true);
    RETURN FALSE;
END;
$$;

-- Test function
CREATE OR REPLACE FUNCTION test_ai_suggestions_rls()
RETURNS void
SECURITY DEFINER
SET search_path = public, mock_auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_agent1_id UUID;
    v_agent2_id UUID;
    v_customer_id UUID;
    v_system_user_id UUID;
    v_ticket1_id UUID;
    v_ticket2_id UUID;
    v_suggestion1_id UUID;
    v_suggestion2_id UUID;
    v_ticket_number INT;
    v_result BOOLEAN;
    v_count INT;
    v_debug_info JSONB;
BEGIN
    -- Get test users
    SELECT id INTO v_agent1_id FROM profiles WHERE email LIKE '%agent1%' LIMIT 1;
    SELECT id INTO v_agent2_id FROM profiles WHERE email LIKE '%agent2%' LIMIT 1;
    SELECT id INTO v_customer_id FROM profiles WHERE email LIKE '%customer%' LIMIT 1;
    SELECT id INTO v_system_user_id FROM profiles WHERE email = 'ai-system@internal.zendesk-replica.com' LIMIT 1;

    -- Initialize debug info
    v_debug_info := jsonb_build_object(
        'agent1_id', v_agent1_id,
        'agent2_id', v_agent2_id,
        'customer_id', v_customer_id,
        'system_user_id', v_system_user_id
    );

    -- Get next available ticket number
    SELECT COALESCE(MAX(ticket_number), 0) + 1 
    INTO v_ticket_number 
    FROM tickets;

    -- Create test tickets
    INSERT INTO tickets (
        id,
        ticket_number,
        title,
        description,
        assigned_to_id,
        customer_id,
        status,
        priority
    ) VALUES (
        gen_random_uuid(),
        v_ticket_number,
        'Test RLS Ticket 1',
        'Test Description 1',
        v_agent1_id,
        v_customer_id,
        'new',
        'medium'
    ) RETURNING id INTO v_ticket1_id;

    INSERT INTO tickets (
        id,
        ticket_number,
        title,
        description,
        assigned_to_id,
        customer_id,
        status,
        priority
    ) VALUES (
        gen_random_uuid(),
        v_ticket_number + 1,
        'Test RLS Ticket 2',
        'Test Description 2',
        v_agent2_id,
        v_customer_id,
        'new',
        'medium'
    ) RETURNING id INTO v_ticket2_id;

    -- Update debug info with ticket IDs
    v_debug_info := v_debug_info || jsonb_build_object(
        'ticket1_id', v_ticket1_id,
        'ticket2_id', v_ticket2_id
    );

    -- Create test suggestions
    INSERT INTO ai_suggestions (
        id,
        ticket_id,
        suggested_response,
        confidence_score,
        system_user_id,
        status
    ) VALUES (
        gen_random_uuid(),
        v_ticket1_id,
        'Test RLS Suggestion 1',
        0.9,
        v_system_user_id,
        'pending'
    ) RETURNING id INTO v_suggestion1_id;

    INSERT INTO ai_suggestions (
        id,
        ticket_id,
        suggested_response,
        confidence_score,
        system_user_id,
        status
    ) VALUES (
        gen_random_uuid(),
        v_ticket2_id,
        'Test RLS Suggestion 2',
        0.8,
        v_system_user_id,
        'pending'
    ) RETURNING id INTO v_suggestion2_id;

    -- Update debug info with suggestion IDs
    v_debug_info := v_debug_info || jsonb_build_object(
        'suggestion1_id', v_suggestion1_id,
        'suggestion2_id', v_suggestion2_id
    );

    -- Test 1: Agent1 should only see suggestion for ticket1
    v_count := check_suggestion_visibility(v_agent1_id, ARRAY[v_suggestion1_id, v_suggestion2_id]);
    INSERT INTO test_results (test_name, test_description, result, error_message, debug_info)
    VALUES (
        'Agent Access Control',
        'Agent should only see suggestions for assigned tickets',
        CASE 
            WHEN v_count = 1 THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN v_count = 1 THEN NULL
            ELSE format('Expected 1 suggestion, got %s', v_count)
        END,
        v_debug_info || jsonb_build_object('visible_suggestions_count', v_count)
    );

    -- Test 2: Customer should see both suggestions
    v_count := check_suggestion_visibility(v_customer_id, ARRAY[v_suggestion1_id, v_suggestion2_id]);
    INSERT INTO test_results (test_name, test_description, result, error_message, debug_info)
    VALUES (
        'Customer Access Control',
        'Customer should see suggestions for their tickets',
        CASE 
            WHEN v_count = 2 THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN v_count = 2 THEN NULL
            ELSE format('Expected 2 suggestions, got %s', v_count)
        END,
        v_debug_info || jsonb_build_object('visible_suggestions_count', v_count)
    );

    -- Test 3: System user should be able to insert
    v_result := try_system_insert(
        v_system_user_id,
        v_ticket1_id,
        'Test RLS System Insert',
        0.7
    );
    INSERT INTO test_results (test_name, test_description, result, error_message, debug_info)
    VALUES (
        'System User Insert',
        'System user should be able to insert suggestions',
        CASE 
            WHEN v_result THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN v_result THEN NULL
            ELSE 'System user insert failed'
        END,
        v_debug_info
    );

    -- Test 4: Agent1 should be able to update suggestion1
    v_result := try_agent_update(v_agent1_id, v_suggestion1_id);
    INSERT INTO test_results (test_name, test_description, result, error_message, debug_info)
    VALUES (
        'Agent Update Control',
        'Agent should be able to update suggestions for assigned tickets',
        CASE 
            WHEN v_result THEN 'PASS'
            ELSE 'FAIL'
        END,
        CASE 
            WHEN v_result THEN NULL
            ELSE 'Agent update failed'
        END,
        v_debug_info
    );
END;
$$;

-- Run tests
SELECT test_ai_suggestions_rls();

-- Display results with all columns including debug info
SELECT 
    test_name,
    test_description,
    result,
    error_message,
    debug_info,
    created_at
FROM test_results 
ORDER BY created_at;

-- Clean up
DROP FUNCTION IF EXISTS check_suggestion_visibility(UUID, UUID[]);
DROP FUNCTION IF EXISTS try_system_insert(UUID, UUID, TEXT, FLOAT);
DROP FUNCTION IF EXISTS try_agent_update(UUID, UUID);
DROP FUNCTION IF EXISTS test_ai_suggestions_rls();
DROP FUNCTION IF EXISTS mock_auth.uid();
DROP SCHEMA IF EXISTS mock_auth CASCADE;
DROP TABLE test_results; 