-- ================================================================
-- CLEANUP SCRIPT - Run this FIRST in Supabase SQL Editor
-- ================================================================
-- This script:
-- 1. Removes any broken RPC functions
-- 2. Closes all stuck "Inside" sessions
-- 3. Removes duplicate entries
-- 4. Adds database constraint to prevent future duplicates
-- ================================================================

-- 1. Drop any RPC functions that might exist
DROP FUNCTION IF EXISTS smart_time_in CASCADE;
DROP FUNCTION IF EXISTS toggle_visit CASCADE;
DROP FUNCTION IF EXISTS handle_visit_toggle CASCADE;
DROP FUNCTION IF EXISTS check_in_out CASCADE;

-- 2. Close ALL open sessions (set time_out to now)
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE time_out IS NULL;

-- 3. Delete duplicate entries (keep only the most recent one per visitor per day)
WITH ranked_visits AS (
  SELECT 
    id,
    visitor_id,
    visit_date,
    time_in,
    ROW_NUMBER() OVER (
      PARTITION BY visitor_id, visit_date 
      ORDER BY time_in DESC
    ) as rn
  FROM visit_logs
)
DELETE FROM visit_logs
WHERE id IN (
  SELECT id FROM ranked_visits WHERE rn > 1
);

-- 4. Add partial unique index to prevent multiple open sessions per visitor
-- This is the KEY fix - database will reject duplicate open sessions
DROP INDEX IF EXISTS idx_one_open_session_per_visitor;
CREATE UNIQUE INDEX idx_one_open_session_per_visitor 
  ON visit_logs(visitor_id) 
  WHERE time_out IS NULL;

-- 5. Verify cleanup
SELECT 
  'Cleanup complete' as status,
  COUNT(*) FILTER (WHERE time_out IS NULL) as open_sessions_remaining
FROM visit_logs;

-- Expected result: 0 open_sessions_remaining

-- 6. Check for any remaining duplicates
SELECT 
  v.full_name,
  v.email,
  COUNT(*) as total_visits,
  COUNT(*) FILTER (WHERE vl.time_out IS NULL) as currently_inside
FROM visitors v
LEFT JOIN visit_logs vl ON v.id = vl.visitor_id
GROUP BY v.id, v.full_name, v.email
HAVING COUNT(*) FILTER (WHERE vl.time_out IS NULL) > 0
ORDER BY currently_inside DESC;

-- Expected result: No rows (all sessions closed)
