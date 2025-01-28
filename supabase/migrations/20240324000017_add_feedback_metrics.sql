-- Create table for storing aggregated metrics
CREATE TABLE IF NOT EXISTS aggregated_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    dimension TEXT, -- For grouping (e.g., feedback_reason, agent_id)
    dimension_value TEXT, -- The value for the dimension
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(metric_type, metric_name, dimension, dimension_value, period_start)
);

-- Add RLS policies
ALTER TABLE aggregated_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can modify the metrics table
CREATE POLICY "Admins can manage metrics"
    ON aggregated_metrics
    FOR ALL
    USING (is_admin());

-- Agents can view metrics
CREATE POLICY "Agents can view metrics"
    ON aggregated_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.name IN ('admin', 'agent')
        )
    );

-- Function to compute hourly metrics
CREATE OR REPLACE FUNCTION compute_hourly_metrics(
    start_time TIMESTAMPTZ DEFAULT (date_trunc('hour', now()) - interval '1 hour'),
    end_time TIMESTAMPTZ DEFAULT date_trunc('hour', now())
)
RETURNS void AS $$
BEGIN
    -- 1. Rejection rate by reason
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        dimension,
        dimension_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'rejection_rate_by_reason',
        COALESCE(COUNT(*) FILTER (WHERE feedback_type = 'rejection')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0), 0),
        'feedback_reason',
        feedback_reason,
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    GROUP BY feedback_reason
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 2. Overall acceptance rate
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'overall_acceptance_rate',
        COALESCE(COUNT(*) FILTER (WHERE feedback_type = 'approval')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0), 0),
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 3. Average confidence scores comparison
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        dimension,
        dimension_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'avg_confidence_score',
        AVG(s.confidence_score),
        'feedback_type',
        fe.feedback_type::text,
        start_time,
        end_time
    FROM ai_feedback_events fe
    JOIN ai_suggestions s ON s.id = fe.suggestion_id
    WHERE fe.created_at >= start_time AND fe.created_at < end_time
    GROUP BY fe.feedback_type
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 4. Time to feedback metrics
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'avg_time_to_feedback_seconds',
        EXTRACT(EPOCH FROM AVG(time_to_feedback)),
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    AND time_to_feedback IS NOT NULL
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;

    -- 5. Top feedback reasons
    INSERT INTO aggregated_metrics (
        metric_type,
        metric_name,
        metric_value,
        dimension,
        dimension_value,
        period_start,
        period_end
    )
    SELECT 
        'feedback',
        'feedback_reason_count',
        COUNT(*)::NUMERIC,
        'feedback_reason',
        feedback_reason,
        start_time,
        end_time
    FROM ai_feedback_events
    WHERE created_at >= start_time AND created_at < end_time
    AND feedback_reason IS NOT NULL
    GROUP BY feedback_reason
    ON CONFLICT (metric_type, metric_name, dimension, dimension_value, period_start)
    DO UPDATE SET 
        metric_value = EXCLUDED.metric_value,
        period_end = EXCLUDED.period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to schedule the hourly metrics computation
CREATE OR REPLACE FUNCTION schedule_hourly_metrics()
RETURNS void AS $$
BEGIN
    PERFORM compute_hourly_metrics(
        date_trunc('hour', now()) - interval '1 hour',
        date_trunc('hour', now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on tables and functions
COMMENT ON TABLE aggregated_metrics IS 'Stores hourly aggregated metrics for feedback analysis';
COMMENT ON FUNCTION compute_hourly_metrics IS 'Computes hourly metrics for feedback analysis';
COMMENT ON FUNCTION schedule_hourly_metrics IS 'Schedules the hourly metrics computation'; 