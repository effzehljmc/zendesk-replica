-- Test file for feedback metrics
BEGIN;

-- Safety check - ensure we're not in production
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
    DELETE FROM ai_feedback_events WHERE feedback_reason LIKE 'Test%';
    DELETE FROM ai_suggestions WHERE suggested_response LIKE 'Test%';
    DELETE FROM tickets WHERE title LIKE 'Test%';
END $$;

-- Create temp table for test results
CREATE TEMP TABLE test_results (
    test_name TEXT,
    test_description TEXT,
    result TEXT,
    passed BOOLEAN,
    execution_order SERIAL
);

-- Setup test data with known values
DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000000';
    v_agent_id UUID := '11111111-1111-1111-1111-111111111111';
    v_ticket_id UUID;
    v_suggestion_id UUID;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_ticket_number INT;
BEGIN
    -- Set fixed time window for testing
    v_start_time := '2024-01-01 10:00:00+00'::TIMESTAMPTZ;
    v_end_time := '2024-01-01 11:00:00+00'::TIMESTAMPTZ;

    -- Get next available ticket number
    SELECT COALESCE(MAX(ticket_number), 0) + 1 
    INTO v_ticket_number 
    FROM tickets;

    -- Create test ticket
    INSERT INTO tickets (
        id, 
        ticket_number, 
        title, 
        description, 
        assigned_to_id, 
        customer_id,
        status,
        priority
    )
    VALUES (
        gen_random_uuid(),
        v_ticket_number,
        'Test Ticket for Metrics',
        'Test Description',
        v_agent_id,
        v_admin_id,  -- Using admin as customer for test purposes
        'new',
        'medium'
    ) RETURNING id INTO v_ticket_id;

    -- Create test suggestion
    INSERT INTO ai_suggestions (id, ticket_id, suggested_response, confidence_score, system_user_id)
    VALUES (
        gen_random_uuid(),
        v_ticket_id,
        'Test suggestion',
        0.9,
        v_admin_id
    ) RETURNING id INTO v_suggestion_id;

    -- Insert test feedback events with known values
    -- 1. Rejection with reason "irrelevant"
    INSERT INTO ai_feedback_events (
        suggestion_id,
        ticket_id,
        agent_id,
        feedback_type,
        feedback_reason,
        time_to_feedback,
        created_at
    ) VALUES (
        v_suggestion_id,
        v_ticket_id,
        v_agent_id,
        'rejection',
        'irrelevant',
        interval '5 minutes',
        v_start_time + interval '10 minutes'
    );

    -- 2. Revision with reason "too generic"
    INSERT INTO ai_feedback_events (
        suggestion_id,
        ticket_id,
        agent_id,
        feedback_type,
        feedback_reason,
        agent_response,
        time_to_feedback,
        created_at
    ) VALUES (
        v_suggestion_id,
        v_ticket_id,
        v_agent_id,
        'revision',
        'too generic',
        'Revised response',
        interval '10 minutes',
        v_start_time + interval '20 minutes'
    );

    -- 3. Approval
    INSERT INTO ai_feedback_events (
        suggestion_id,
        ticket_id,
        agent_id,
        feedback_type,
        time_to_feedback,
        created_at
    ) VALUES (
        v_suggestion_id,
        v_ticket_id,
        v_agent_id,
        'approval',
        interval '2 minutes',
        v_start_time + interval '30 minutes'
    );

    -- Compute metrics for the test period
    PERFORM compute_hourly_metrics(v_start_time, v_end_time);

    -- Test 1: Verify rejection rate calculation
    WITH rejection_rate AS (
        SELECT metric_value
        FROM aggregated_metrics
        WHERE metric_type = 'feedback'
        AND metric_name = 'rejection_rate_by_reason'
        AND dimension_value = 'irrelevant'
        AND period_start = v_start_time
    )
    INSERT INTO test_results (test_name, test_description, result, passed)
    SELECT 
        'Rejection Rate Test',
        'Verify rejection rate calculation for "irrelevant" reason',
        format('Rejection rate: %s (expected ~0.33)', metric_value),
        abs(metric_value - 0.33333) < 0.001
    FROM rejection_rate;

    -- Test 2: Verify overall acceptance rate
    WITH acceptance_rate AS (
        SELECT metric_value
        FROM aggregated_metrics
        WHERE metric_type = 'feedback'
        AND metric_name = 'overall_acceptance_rate'
        AND period_start = v_start_time
    )
    INSERT INTO test_results (test_name, test_description, result, passed)
    SELECT 
        'Acceptance Rate Test',
        'Verify overall acceptance rate calculation',
        format('Acceptance rate: %s (expected ~0.33)', metric_value),
        abs(metric_value - 0.33333) < 0.001
    FROM acceptance_rate;

    -- Test 3: Verify average confidence score
    WITH avg_confidence AS (
        SELECT metric_value
        FROM aggregated_metrics
        WHERE metric_type = 'feedback'
        AND metric_name = 'avg_confidence_score'
        AND dimension = 'feedback_type'
        AND dimension_value = 'approval'
        AND period_start = v_start_time
    )
    INSERT INTO test_results (test_name, test_description, result, passed)
    SELECT 
        'Confidence Score Test',
        'Verify average confidence score for approved suggestions',
        format('Average confidence: %s (expected 0.9)', metric_value),
        abs(metric_value - 0.9) < 0.001
    FROM avg_confidence;

    -- Test 4: Verify time to feedback calculation
    WITH time_to_feedback AS (
        SELECT metric_value
        FROM aggregated_metrics
        WHERE metric_type = 'feedback'
        AND metric_name = 'avg_time_to_feedback_seconds'
        AND period_start = v_start_time
    )
    INSERT INTO test_results (test_name, test_description, result, passed)
    SELECT 
        'Time to Feedback Test',
        'Verify average time to feedback calculation',
        format('Average time (seconds): %s (expected ~340)', metric_value),
        abs(metric_value - 340) < 1
    FROM time_to_feedback;

    -- Test 5: Verify feedback reason counts
    WITH reason_counts AS (
        SELECT COUNT(*) as total_reasons
        FROM aggregated_metrics
        WHERE metric_type = 'feedback'
        AND metric_name = 'feedback_reason_count'
        AND period_start = v_start_time
    )
    INSERT INTO test_results (test_name, test_description, result, passed)
    SELECT 
        'Feedback Reason Count Test',
        'Verify feedback reason count calculation',
        format('Number of reasons: %s (expected 2)', total_reasons),
        total_reasons = 2
    FROM reason_counts;
END $$;

-- Display all results in a single query
WITH test_summary AS (
    SELECT 
        '=== TEST RESULTS ===' as section,
        NULL::text as metric_type,
        NULL::text as metric_name,
        NULL::numeric as metric_value,
        NULL::text as dimension_value,
        NULL::boolean as passed
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
        NULL, NULL, NULL, NULL,
        passed
    FROM test_results
    UNION ALL
    SELECT 
        '=== RAW METRICS ===' as section,
        NULL, NULL, NULL, NULL,
        NULL
    UNION ALL
    SELECT 
        format(
            '%s - %s: %s %s',
            metric_type,
            metric_name,
            metric_value,
            COALESCE(dimension_value, '')
        ),
        metric_type,
        metric_name,
        metric_value,
        dimension_value,
        NULL
    FROM aggregated_metrics
    WHERE period_start = '2024-01-01 10:00:00+00'::TIMESTAMPTZ
)
SELECT 
    section,
    CASE 
        WHEN passed IS NOT NULL THEN
            CASE WHEN passed THEN '✅' ELSE '❌' END
        ELSE ''
    END as status,
    CASE 
        WHEN metric_value IS NOT NULL THEN
            format(
                '(%s: %s%s)',
                metric_name,
                round(metric_value::numeric, 4),
                CASE WHEN dimension_value IS NOT NULL THEN ' - ' || dimension_value ELSE '' END
            )
        ELSE ''
    END as details
FROM test_summary
ORDER BY 
    CASE 
        WHEN section = '=== TEST RESULTS ===' THEN 1
        WHEN section LIKE 'Test%' THEN 2
        WHEN section = '=== RAW METRICS ===' THEN 3
        ELSE 4
    END,
    metric_type,
    metric_name,
    dimension_value;

ROLLBACK; 