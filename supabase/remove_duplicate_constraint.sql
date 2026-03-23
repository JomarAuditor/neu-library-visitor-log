-- ============================================================================
-- Remove Database Constraint - Allow Application-Level Smart Toggle
-- ============================================================================
-- This removes the database-level unique constraint that was causing
-- the "duplicate entry" error. The Smart Toggle logic in the application
-- will handle session management instead.
-- ============================================================================

-- Remove the trigger
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs;

-- Remove the function
DROP FUNCTION IF EXISTS check_no_duplicate_active_sessions();

-- Remove the unique partial index
DROP INDEX IF EXISTS idx_one_active_session_per_visitor;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to confirm removal:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'visit_logs' AND indexname = 'idx_one_active_session_per_visitor';
-- Should return 0 rows

-- ============================================================================
-- NOTE: Smart Toggle Logic Now Handled in Application
-- ============================================================================
-- The application (VisitorHome.tsx) now handles:
-- 1. Check for open session (time_out IS NULL)
-- 2. If open session exists → TIME OUT automatically
-- 3. If no open session → Allow TIME IN
-- 4. This works across all devices seamlessly
-- ============================================================================
