-- ============================================================================
-- REMOVE ALL BLOCKING CONSTRAINTS
-- ============================================================================
-- This removes any constraints that prevent the smart toggle from working
-- ============================================================================

-- Drop the unique index if it exists
DROP INDEX IF EXISTS idx_one_active_session_per_visitor;

-- Drop any triggers that might be blocking
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs;
DROP TRIGGER IF EXISTS check_active_session_trigger ON visit_logs;
DROP TRIGGER IF EXISTS enforce_single_active_session ON visit_logs;

-- Drop any functions related to session checking
DROP FUNCTION IF EXISTS prevent_duplicate_active_sessions() CASCADE;
DROP FUNCTION IF EXISTS check_active_session() CASCADE;
DROP FUNCTION IF EXISTS enforce_single_active_session() CASCADE;

-- Verify all constraints are removed
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'visit_logs'::regclass
  AND conname LIKE '%session%' OR conname LIKE '%duplicate%';

-- Should return 0 rows

-- Verify all triggers are removed
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'visit_logs';

-- Should return 0 rows (or only RLS triggers)
