-- ================================================================
-- REMOVE UNIQUE CONSTRAINT & CLEAN WAYNE'S ACCOUNT
-- Run this in Supabase SQL Editor
-- ================================================================

-- Step 1: Drop the unique constraint (if it exists)
DROP INDEX IF EXISTS idx_one_open_session_per_visitor;

-- Step 2: Close all of Wayne's open sessions
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE visitor_id = (
  SELECT id FROM visitors WHERE email = 'wayneandy.villamor@neu.edu.ph'
)
AND time_out IS NULL;

-- Step 3: Verify cleanup
SELECT 
  v.full_name,
  v.email,
  COUNT(*) as total_visits,
  COUNT(*) FILTER (WHERE vl.time_out IS NULL) as currently_inside
FROM visitors v
LEFT JOIN visit_logs vl ON v.id = vl.visitor_id
WHERE v.email = 'wayneandy.villamor@neu.edu.ph'
GROUP BY v.id, v.full_name, v.email;

-- Expected result: currently_inside = 0

-- Step 4: Verify the index is gone
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'visit_logs' 
AND indexname = 'idx_one_open_session_per_visitor';

-- Expected result: No rows (index is dropped)

SELECT '✅ Cleanup complete! Wayne can now sign in without constraint errors.' as status;
