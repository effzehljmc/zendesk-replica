-- Drop existing functions first
DROP FUNCTION IF EXISTS compute_hourly_metrics(timestamptz, timestamptz);
DROP FUNCTION IF EXISTS schedule_hourly_metrics();

-- Function to compute hourly metrics
CREATE OR REPLACE FUNCTION compute_hourly_metrics(
  start_time timestamptz,
  end_time timestamptz
) RETURNS void AS $$
DECLARE
  has_data boolean;
BEGIN
  -- Check if we have any data for this period
  SELECT EXISTS (
    SELECT 1 
    FROM ai_feedback_events 
    WHERE created_at >= start_time AND created_at < end_time
  ) INTO has_data;

  -- Only proceed with metrics if we have data
  IF has_data THEN
    -- 1. Rejection rate by reason
    INSERT INTO aggregated_metrics (
      metric_type,
      metric_name,
      metric_value,
      dimension,
      dimension_value,
      period_start,
      period_end,
      metadata
    )
    SELECT 
      'feedback',
      'rejection_rate',
      COALESCE(COUNT(*) FILTER (WHERE feedback_type = 'rejection')::numeric / NULLIF(COUNT(*)::numeric, 0), 0),
      'reason',
      feedback_reason,
      start_time,
      end_time,
      jsonb_build_object(
        'total_feedback', COUNT(*),
        'total_rejections', COUNT(*) FILTER (WHERE feedback_type = 'rejection')
      )
    FROM ai_feedback_events
    WHERE created_at >= start_time 
      AND created_at < end_time
      AND feedback_reason IS NOT NULL
    GROUP BY feedback_reason
    HAVING COUNT(*) > 0;

    -- 2. Overall acceptance rate
    INSERT INTO aggregated_metrics (
      metric_type,
      metric_name,
      metric_value,
      period_start,
      period_end,
      metadata
    )
    SELECT 
      'feedback',
      'overall_acceptance_rate',
      COALESCE(COUNT(*) FILTER (WHERE feedback_type = 'approval')::numeric / NULLIF(COUNT(*)::numeric, 0), 0),
      start_time,
      end_time,
      jsonb_build_object(
        'total_feedback', COUNT(*),
        'total_approvals', COUNT(*) FILTER (WHERE feedback_type = 'approval')
      )
    FROM ai_feedback_events
    WHERE created_at >= start_time 
      AND created_at < end_time
    HAVING COUNT(*) > 0;

    -- 3. Average confidence comparison (accepted vs rejected)
    INSERT INTO aggregated_metrics (
      metric_type,
      metric_name,
      metric_value,
      dimension,
      dimension_value,
      period_start,
      period_end,
      metadata
    )
    SELECT 
      'confidence',
      'avg_confidence_by_feedback',
      COALESCE(AVG(s.confidence_score), 0),
      'feedback_type',
      f.feedback_type,
      start_time,
      end_time,
      jsonb_build_object(
        'sample_size', COUNT(*)
      )
    FROM ai_feedback_events f
    JOIN ai_suggestions s ON f.suggestion_id = s.id
    WHERE f.created_at >= start_time 
      AND f.created_at < end_time
    GROUP BY f.feedback_type
    HAVING COUNT(*) > 0;

    -- 4. Time to feedback metrics
    INSERT INTO aggregated_metrics (
      metric_type,
      metric_name,
      metric_value,
      period_start,
      period_end,
      metadata
    )
    SELECT 
      'performance',
      'avg_time_to_feedback_seconds',
      COALESCE(EXTRACT(EPOCH FROM AVG(time_to_feedback::interval)), 0),
      start_time,
      end_time,
      jsonb_build_object(
        'sample_size', COUNT(*),
        'min_seconds', EXTRACT(EPOCH FROM MIN(time_to_feedback::interval)),
        'max_seconds', EXTRACT(EPOCH FROM MAX(time_to_feedback::interval))
      )
    FROM ai_feedback_events
    WHERE created_at >= start_time 
      AND created_at < end_time
      AND time_to_feedback IS NOT NULL
    HAVING COUNT(*) > 0;

    -- 5. Agent performance metrics
    INSERT INTO aggregated_metrics (
      metric_type,
      metric_name,
      metric_value,
      dimension,
      dimension_value,
      period_start,
      period_end,
      metadata
    )
    SELECT 
      'agent_performance',
      'feedback_stats',
      COUNT(*)::numeric,
      'agent_id',
      agent_id::text,
      start_time,
      end_time,
      jsonb_build_object(
        'approvals', COUNT(*) FILTER (WHERE feedback_type = 'approval'),
        'rejections', COUNT(*) FILTER (WHERE feedback_type = 'rejection'),
        'revisions', COUNT(*) FILTER (WHERE feedback_type = 'revision'),
        'avg_time_to_feedback_seconds', COALESCE(EXTRACT(EPOCH FROM AVG(time_to_feedback::interval)), 0)
      )
    FROM ai_feedback_events
    WHERE created_at >= start_time 
      AND created_at < end_time
    GROUP BY agent_id
    HAVING COUNT(*) > 0;
  END IF;

  -- Log execution regardless of whether we had data
  INSERT INTO public.cron_job_log (
    job_name,
    status,
    message,
    metadata
  ) VALUES (
    'compute_hourly_metrics',
    'completed',
    CASE 
      WHEN has_data THEN format('Computed metrics from %s to %s', start_time, end_time)
      ELSE format('No data found for period %s to %s', start_time, end_time)
    END,
    jsonb_build_object(
      'period_start', start_time,
      'period_end', end_time,
      'has_data', has_data,
      'executed_at', now()
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Function to schedule hourly metrics computation
CREATE OR REPLACE FUNCTION schedule_hourly_metrics() RETURNS void AS $$
DECLARE
  current_hour timestamptz;
  next_hour timestamptz;
BEGIN
  -- Calculate the start and end of the previous hour
  current_hour := date_trunc('hour', now());
  next_hour := current_hour + interval '1 hour';
  
  -- Compute metrics for the previous hour
  PERFORM compute_hourly_metrics(current_hour - interval '1 hour', current_hour);
  
  -- Log the execution
  INSERT INTO public.cron_job_log (
    job_name,
    status,
    message,
    metadata
  ) VALUES (
    'hourly_metrics_aggregation',
    'completed',
    format('Computed metrics from %s to %s', current_hour - interval '1 hour', current_hour),
    jsonb_build_object(
      'period_start', current_hour - interval '1 hour',
      'period_end', current_hour,
      'executed_at', now()
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Create a table to log cron job executions if it doesn't exist
CREATE TABLE IF NOT EXISTS public.cron_job_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Note: Scheduling will be handled by Supabase Edge Functions
-- Remove the pg_cron scheduling attempt

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_period ON aggregated_metrics (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_type_name ON aggregated_metrics (metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_log_job_name ON cron_job_log (job_name);

-- Grant necessary permissions
ALTER TABLE public.cron_job_log ENABLE ROW LEVEL SECURITY;

-- Only allow system and admin roles to view cron logs
CREATE POLICY "Allow admins to manage cron logs" ON public.cron_job_log
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON FUNCTION compute_hourly_metrics IS 'Computes various metrics from AI feedback events for a given time period';
COMMENT ON FUNCTION schedule_hourly_metrics IS 'Scheduled function that runs hourly to compute metrics for the previous hour';
COMMENT ON TABLE cron_job_log IS 'Logs execution details of scheduled jobs';

-- Manual test execution for the last 24 hours
DO $$
DECLARE
  current_ts timestamptz := now();
  hour_start timestamptz;
BEGIN
  -- Test for the last 24 hours, hour by hour
  FOR i IN 1..24 LOOP
    hour_start := date_trunc('hour', current_ts - (i || ' hours')::interval);
    PERFORM compute_hourly_metrics(
      hour_start,
      hour_start + interval '1 hour'
    );
    
    -- Log the test execution
    INSERT INTO public.cron_job_log (
      job_name,
      status,
      message,
      metadata
    ) VALUES (
      'hourly_metrics_aggregation_initial_test',
      'completed',
      format('Initial test: Computed metrics for hour starting at %s', hour_start),
      jsonb_build_object(
        'period_start', hour_start,
        'period_end', hour_start + interval '1 hour',
        'executed_at', now(),
        'is_test', true
      )
    );
  END LOOP;
END $$; 