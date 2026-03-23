-- ============================================================================
-- NEU Library Visitor Log - Prevent Duplicate Active Sessions
-- ============================================================================
-- This migration adds a database-level constraint to prevent multiple
-- active sessions (time_out IS NULL) for the same visitor across all devices.
--
-- CRITICAL SECURITY: Ensures only ONE active "Inside" session per visitor
-- ============================================================================

-- Step 1: Create a unique partial index
-- This prevents inserting a new row with time_out = NULL if one already exists
-- for the same visitor_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_session_per_visitor
ON visit_logs (visitor_id)
WHERE time_out IS NULL;

-- Step 2: Add a check constraint function (optional, for extra safety)
-- This function validates that a visitor doesn't have multiple open sessions
CREATE OR REPLACE FUNCTION check_no_duplicate_active_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check on INSERT or UPDATE that sets time_out to NULL
  IF (TG_OP = 'INSERT' AND NEW.time_out IS NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.time_out IS NULL AND OLD.time_out IS NOT NULL) THEN
    
    -- Check if visitor already has an active session
    IF EXISTS (
      SELECT 1 
      FROM visit_logs 
      WHERE visitor_id = NEW.visitor_id 
        AND time_out IS NULL 
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Visitor already has an active session. Please time out first.'
        USING HINT = 'Only one active session per visitor is allowed.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to enforce the constraint
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs;
CREATE TRIGGER prevent_duplicate_active_sessions
  BEFORE INSERT OR UPDATE ON visit_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_no_duplicate_active_sessions();

-- ============================================================================
-- VERIFICATION QUERIES (run these to test)
-- ============================================================================

-- Test 1: Check if index was created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'visit_logs' 
--   AND indexname = 'idx_one_active_session_per_visitor';

-- Test 2: Check if trigger was created
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name = 'prevent_duplicate_active_sessions';

-- Test 3: Try to create duplicate active session (should fail)
-- INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
-- VALUES (
--   (SELECT id FROM visitors LIMIT 1),
--   'Reading',
--   NOW(),
--   CURRENT_DATE
-- );
-- -- Run this twice - second time should fail with unique constraint violation

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs;
-- DROP FUNCTION IF EXISTS check_no_duplicate_active_sessions();
-- DROP INDEX IF EXISTS idx_one_active_session_per_visitor;
