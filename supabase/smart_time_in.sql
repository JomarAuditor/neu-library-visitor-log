-- ============================================================================
-- ATOMIC SMART TIME IN FUNCTION
-- ============================================================================
-- This function prevents race conditions by executing in a single transaction:
-- 1. Close ALL open sessions for the visitor
-- 2. Insert new session
-- Both operations are atomic - either both succeed or both fail
-- ============================================================================

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
  -- Step 1: Close all open sessions for this visitor
  UPDATE visit_logs
  SET 
    time_out = p_time_in,
    duration_minutes = 0
  WHERE 
    visitor_id = p_visitor_id 
    AND time_out IS NULL;
  
  -- Step 2: Insert new session
  INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
  VALUES (p_visitor_id, p_purpose, p_time_in, p_visit_date);
  
  -- Both operations are in the same transaction
  -- If either fails, both are rolled back
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION smart_time_in(UUID, TEXT, TIMESTAMPTZ, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION smart_time_in(UUID, TEXT, TIMESTAMPTZ, DATE) TO anon;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the function was created:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name = 'smart_time_in';
-- ============================================================================
