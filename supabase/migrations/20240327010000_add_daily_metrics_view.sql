-- Drop existing view and function
DROP VIEW IF EXISTS daily_metrics CASCADE;
DROP FUNCTION IF EXISTS get_last_7_days_metrics();

-- Create a view for daily metrics
CREATE OR REPLACE VIEW daily_metrics AS
WITH daily_rates AS (
  -- Get daily acceptance and rejection rates
  SELECT 
    date_trunc('day', created_at)::timestamp with time zone as day,
    COUNT(*) FILTER (WHERE feedback_type = 'approval')::numeric as approvals,
    COUNT(*) FILTER (WHERE feedback_type = 'rejection')::numeric as rejections,
    COUNT(*)::numeric as total_feedback
  FROM ai_feedback_events
  GROUP BY date_trunc('day', created_at)
),
daily_reasons AS (
  -- Get top feedback reasons per day
  SELECT 
    date_trunc('day', created_at)::timestamp with time zone as day,
    feedback_reason as reason,
    COUNT(*) as rejection_count,
    ROW_NUMBER() OVER (PARTITION BY date_trunc('day', created_at) ORDER BY COUNT(*) DESC) as rank
  FROM ai_feedback_events
  WHERE feedback_type = 'rejection'
    AND feedback_reason IS NOT NULL
  GROUP BY date_trunc('day', created_at), feedback_reason
)
SELECT 
  r.day::timestamp with time zone,
  CASE 
    WHEN r.total_feedback > 0 THEN (r.approvals / r.total_feedback)::numeric
    ELSE 0
  END as acceptance_rate,
  CASE 
    WHEN r.total_feedback > 0 THEN (r.rejections / r.total_feedback)::numeric
    ELSE 0
  END as rejection_rate,
  r.total_feedback::numeric as total_feedback,
  jsonb_build_object(
    'top_reasons', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'reason', reason,
          'count', rejection_count::numeric
        ))
        FROM daily_reasons dr
        WHERE dr.day = r.day
          AND dr.rank <= 3  -- Top 3 reasons only
      ),
      '[]'::jsonb
    )
  ) as metadata
FROM daily_rates r
ORDER BY r.day DESC;

-- Add a comment to the view
COMMENT ON VIEW daily_metrics IS 'Daily aggregation of acceptance rates, rejection rates, and top feedback reasons';

-- Grant necessary permissions on the view
GRANT SELECT ON daily_metrics TO authenticated;

-- Create a helper function to get the last 7 days of metrics
CREATE OR REPLACE FUNCTION get_last_7_days_metrics()
RETURNS TABLE (
  day timestamp with time zone,
  acceptance_rate numeric,
  rejection_rate numeric,
  total_feedback numeric,
  metadata jsonb
) SECURITY DEFINER 
STABLE    -- Mark as stable since it doesn't modify data
PARALLEL SAFE  -- Can be parallelized safely
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT 
    d.day::timestamp with time zone,
    d.acceptance_rate::numeric,
    d.rejection_rate::numeric,
    d.total_feedback::numeric,
    d.metadata::jsonb
  FROM daily_metrics d
  WHERE d.day >= date_trunc('day', now()) - interval '7 days'
  ORDER BY d.day DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_last_7_days_metrics() TO authenticated;

-- Handle policy creation/update
DO $$
BEGIN
    -- Drop the policy if it exists
    DROP POLICY IF EXISTS "Allow authenticated to view daily metrics" ON aggregated_metrics;
    
    -- Create the policy
    CREATE POLICY "Allow authenticated to view daily metrics"
        ON aggregated_metrics
        FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION
    WHEN OTHERS THEN
        -- Log any errors but don't fail the migration
        RAISE NOTICE 'Error managing policy: %', SQLERRM;
END;
$$; 