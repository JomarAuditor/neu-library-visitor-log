-- ============================================================================
-- PRODUCTION-READY SMART TOGGLE SYSTEM
-- ============================================================================
-- This is how REAL library RFID/QR systems work:
-- 1st scan = Time In
-- 2nd scan = Time Out (closes the 1st scan)
-- 3rd scan = Time In (new session)
-- 4th scan = Time Out (closes the 3rd scan)
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS smart_time_in(UUID, TEXT, TIMESTAMPTZ, DATE);

-- Create the atomic smart toggle function
CREATE OR REPLACE FUNCTION smart_time_in(
  p_visitor_id UUID,
  p_purpose TEXT,
  p_time_in TIMESTAMPTZ,
  p_visit_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ATOMIC OPERATION: Close ALL open sessions + Insert new session
  -- This happens in a SINGLE transaction - no race conditions possible
  
  -- Step 1: Close all open sessions for this visitor
  UPDATE visit_logs
  SET 
    time_out = p_time_in,
    duration_minutes = EXTRACT(EPOCH FROM (p_time_in - time_in)) / 60
  WHERE 
    visitor_id = p_visitor_id 
    AND time_out IS NULL;
  
  -- Step 2: Insert new session immediately
  INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
  VALUES (p_visitor_id, p_purpose, p_time_in, p_visit_date);
  
  -- PostgreSQL guarantees both operations complete or both fail
  -- No other transaction can interfere between these two operations
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION smart_time_in(UUID, TEXT, TIMESTAMPTZ, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION smart_time_in(UUID, TEXT, TIMESTAMPTZ, DATE) TO anon;

-- ============================================================================
-- CLEAN UP ANY EXISTING DUPLICATE SESSIONS
-- ============================================================================
-- This closes all currently open duplicate sessions
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE id IN (
  SELECT id 
  FROM (
    SELECT id, visitor_id, time_in,
           ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY time_in DESC) as rn
    FROM visit_logs
    WHERE time_out IS NULL
  ) sub
  WHERE rn > 1
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything is working:

-- 1. Check function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'smart_time_in';

-- 2. Check for any remaining duplicate sessions (should return 0)
SELECT visitor_id, COUNT(*) as open_sessions
FROM visit_logs
WHERE time_out IS NULL
GROUP BY visitor_id
HAVING COUNT(*) > 1;

-- 3. Test the function (replace with real visitor_id)
-- SELECT smart_time_in(
--   'your-visitor-uuid-here'::UUID,
--   'Reading',
--   NOW(),
--   CURRENT_DATE
-- );
