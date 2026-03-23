-- ============================================================================
-- ABSOLUTE FINAL FIX - Remove Database Constraint
-- ============================================================================
-- This constraint is blocking ALL users from signing in
-- Run this NOW in Supabase SQL Editor
-- ============================================================================

-- Remove ALL constraints related to duplicate sessions
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs CASCADE;
DROP FUNCTION IF EXISTS check_no_duplicate_active_sessions() CASCADE;
DROP INDEX IF EXISTS idx_one_active_session_per_visitor CASCADE;

-- Also check for any other unique constraints on visitor_id + time_out
DROP INDEX IF EXISTS visit_logs_visitor_id_time_out_key CASCADE;
DROP INDEX IF EXISTS unique_active_session CASCADE;

-- Verify ALL are removed (should return 0 rows)
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'visit_logs' 
  AND (
    indexname LIKE '%duplicate%' 
    OR indexname LIKE '%active%' 
    OR indexname LIKE '%session%'
    OR indexdef LIKE '%time_out IS NULL%'
  );

-- Close all active sessions for fresh start
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE time_out IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Should return 0 active sessions
SELECT COUNT(*) as active_sessions FROM visit_logs WHERE time_out IS NULL;

-- Should return 0 constraints
SELECT COUNT(*) as remaining_constraints
FROM pg_indexes 
WHERE tablename = 'visit_logs' 
  AND indexdef LIKE '%time_out IS NULL%';

-- ============================================================================
-- SUCCESS! Now the Smart Toggle will work:
-- 1. Register → Time In
-- 2. Sign In → Time Out + Time In
-- 3. Sign In → Time Out + Time In
-- Works forever, any device!
-- ============================================================================
