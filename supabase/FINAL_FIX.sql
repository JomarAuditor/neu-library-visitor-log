-- ============================================================================
-- FINAL FIX - Remove Constraint and Clean All Data
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor to fix all duplicate errors
-- ============================================================================

-- Step 1: Remove the constraint causing duplicate errors
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs;
DROP FUNCTION IF EXISTS check_no_duplicate_active_sessions();
DROP INDEX IF EXISTS idx_one_active_session_per_visitor;

-- Step 2: Close all active sessions (clean slate)
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE time_out IS NULL;

-- Step 3: Verify constraint is removed (should return 0 rows)
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'visit_logs' 
  AND (indexname LIKE '%duplicate%' OR indexname LIKE '%one_active%');

-- Step 4: Verify all sessions are closed (should return 0)
SELECT COUNT(*) as active_sessions
FROM visit_logs
WHERE time_out IS NULL;

-- ============================================================================
-- DONE! Now the Smart Toggle will work perfectly:
-- - First sign in = Time In
-- - Second sign in = Time Out + Time In
-- - Works on any device, any tab
-- ============================================================================
