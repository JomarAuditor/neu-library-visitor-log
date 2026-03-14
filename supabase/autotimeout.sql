-- =====================================================================
-- NEU Library Visitor Log System
-- Auto Time-Out: Closes all open sessions at 6:00 PM Philippine Time
-- Run this THIRD in Supabase SQL Editor
-- =====================================================================
-- How it works:
--   A pg_cron job fires every day at 10:00 UTC (= 18:00 PHT / 6 PM).
--   It finds all visitor_logs where time_out IS NULL, sets time_out to
--   6 PM, and calculates duration_minutes automatically.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- The auto-timeout function
CREATE OR REPLACE FUNCTION public.auto_timeout_visitors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_utc    TIMESTAMPTZ;
  rows_affected INTEGER;
BEGIN
  -- 6:00 PM Philippine Standard Time (UTC+8) expressed as UTC
  cutoff_utc := (
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE + TIME '18:00:00'
  ) AT TIME ZONE 'Asia/Manila';

  UPDATE public.visitor_logs
  SET
    time_out         = cutoff_utc,
    duration_minutes = GREATEST(
      0,
      EXTRACT(EPOCH FROM (cutoff_utc - time_in))::INTEGER / 60
    )
  WHERE
    time_out IS NULL
    AND time_in < cutoff_utc;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RAISE NOTICE 'NEU Library Auto Time-Out: Closed % session(s) at 6:00 PM PHT (%)',
    rows_affected, cutoff_utc;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_timeout_visitors() TO postgres;

-- Remove existing schedule if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'neu-library-auto-timeout') THEN
    PERFORM cron.unschedule('neu-library-auto-timeout');
    RAISE NOTICE 'Removed existing cron job.';
  END IF;
END $$;

-- Schedule: every day at 10:00 UTC = 18:00 PHT
SELECT cron.schedule(
  'neu-library-auto-timeout',
  '0 10 * * *',
  'SELECT public.auto_timeout_visitors();'
);

-- Confirm scheduled
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'neu-library-auto-timeout';

-- =====================================================================
-- MANUAL TEST COMMANDS
-- =====================================================================
-- Run the function right now (for testing):
--   SELECT public.auto_timeout_visitors();
--
-- Check all scheduled jobs:
--   SELECT * FROM cron.job;
--
-- Check execution history:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- Disable the job (without deleting):
--   UPDATE cron.job SET active = false WHERE jobname = 'neu-library-auto-timeout';
--
-- Delete the job:
--   SELECT cron.unschedule('neu-library-auto-timeout');
-- =====================================================================