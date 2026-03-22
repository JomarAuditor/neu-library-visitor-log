-- =====================================================================
-- NEU Library - Cleanup Script for Duplicate "Inside" Entries
-- Run this BEFORE deploying the new toggle logic
-- =====================================================================

-- Step 1: Identify visitors with multiple open sessions
-- This should ideally return 0 rows after cleanup
SELECT 
  v.email,
  v.full_name,
  COUNT(*) as open_sessions,
  STRING_AGG(vl.id::TEXT, ', ') as log_ids
FROM visit_logs vl
JOIN visitors v ON v.id = vl.visitor_id
WHERE vl.time_out IS NULL
GROUP BY v.id, v.email, v.full_name
HAVING COUNT(*) > 1
ORDER BY open_sessions DESC;

-- Step 2: Auto-close all duplicate open sessions except the most recent one
-- This keeps the latest Time In and closes all older ones
WITH ranked_logs AS (
  SELECT 
    id,
    visitor_id,
    time_in,
    ROW_NUMBER() OVER (
      PARTITION BY visitor_id 
      ORDER BY time_in DESC
    ) as rn
  FROM visit_logs
  WHERE time_out IS NULL
)
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in))::INT / 60
WHERE id IN (
  SELECT id 
  FROM ranked_logs 
  WHERE rn > 1  -- Close all except the most recent (rn = 1)
);

-- Step 3: Verify cleanup - should return 0 or 1 per visitor
SELECT 
  visitor_id,
  COUNT(*) as open_sessions
FROM visit_logs
WHERE time_out IS NULL
GROUP BY visitor_id
HAVING COUNT(*) > 1;

-- Step 4: Get summary statistics
SELECT 
  'Total Visitors' as metric,
  COUNT(DISTINCT id) as count
FROM visitors
UNION ALL
SELECT 
  'Currently Inside',
  COUNT(DISTINCT visitor_id)
FROM visit_logs
WHERE time_out IS NULL
UNION ALL
SELECT 
  'Total Visits Today',
  COUNT(*)
FROM visit_logs
WHERE visit_date = CURRENT_DATE
UNION ALL
SELECT 
  'Completed Visits Today',
  COUNT(*)
FROM visit_logs
WHERE visit_date = CURRENT_DATE 
  AND time_out IS NOT NULL;

-- =====================================================================
-- Optional: Manual cleanup for specific visitor
-- =====================================================================

-- Find all open sessions for a specific email
-- SELECT vl.*, v.email, v.full_name
-- FROM visit_logs vl
-- JOIN visitors v ON v.id = vl.visitor_id
-- WHERE v.email = 'student@neu.edu.ph'
--   AND vl.time_out IS NULL
-- ORDER BY vl.time_in DESC;

-- Close all open sessions for a specific visitor (keep most recent)
-- WITH target_visitor AS (
--   SELECT id FROM visitors WHERE email = 'student@neu.edu.ph'
-- ),
-- ranked_logs AS (
--   SELECT 
--     vl.id,
--     vl.time_in,
--     ROW_NUMBER() OVER (ORDER BY vl.time_in DESC) as rn
--   FROM visit_logs vl
--   WHERE vl.visitor_id = (SELECT id FROM target_visitor)
--     AND vl.time_out IS NULL
-- )
-- UPDATE visit_logs
-- SET 
--   time_out = NOW(),
--   duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in))::INT / 60
-- WHERE id IN (
--   SELECT id FROM ranked_logs WHERE rn > 1
-- );

-- =====================================================================
-- Validation Queries
-- =====================================================================

-- Check for any visitor with more than 1 open session
SELECT 
  v.email,
  v.full_name,
  COUNT(*) as open_count
FROM visit_logs vl
JOIN visitors v ON v.id = vl.visitor_id
WHERE vl.time_out IS NULL
GROUP BY v.id, v.email, v.full_name
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Get list of all currently inside visitors
SELECT 
  v.full_name,
  v.email,
  v.visitor_type,
  vl.purpose,
  vl.time_in,
  EXTRACT(EPOCH FROM (NOW() - vl.time_in))::INT / 60 as minutes_inside
FROM visit_logs vl
JOIN visitors v ON v.id = vl.visitor_id
WHERE vl.time_out IS NULL
ORDER BY vl.time_in DESC;

-- =====================================================================
-- Index Verification
-- =====================================================================

-- Verify the critical index exists
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'visit_logs'
  AND indexname = 'idx_visit_logs_open';
-- Expected: 1 row showing the partial index

-- If index doesn't exist, create it:
-- CREATE INDEX IF NOT EXISTS idx_visit_logs_open 
-- ON visit_logs(visitor_id, time_out) 
-- WHERE time_out IS NULL;

-- =====================================================================
-- Performance Test
-- =====================================================================

-- Test query performance for open session lookup
EXPLAIN ANALYZE
SELECT id, time_in, purpose
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors LIMIT 1)
  AND time_out IS NULL
ORDER BY time_in DESC
LIMIT 1;
-- Should use idx_visit_logs_open index

-- =====================================================================
-- Success Confirmation
-- =====================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM visit_logs 
      WHERE time_out IS NULL 
      GROUP BY visitor_id 
      HAVING COUNT(*) > 1
    ) THEN '❌ FAILED - Duplicates still exist'
    ELSE '✅ SUCCESS - No duplicate open sessions'
  END as cleanup_status;
