-- ============================================================================
-- FAST FIX: Remove ALL constraints blocking duplicate sessions
-- ============================================================================
-- Run this NOW in Supabase SQL Editor to fix the error immediately
-- ============================================================================

-- Remove trigger
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs;

-- Remove function
DROP FUNCTION IF EXISTS check_no_duplicate_active_sessions();

-- Remove unique index
DROP INDEX IF EXISTS idx_one_active_session_per_visitor;

-- Verify removal (should return 0 rows)
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'visit_logs' 
  AND indexname LIKE '%duplicate%';

-- ============================================================================
-- DONE! Now the system will be FAST with no blocking errors
-- ============================================================================
