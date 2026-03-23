-- =====================================================================
-- NEU Library - Prevent Duplicate Open Sessions
-- Run this in Supabase SQL Editor to add database-level protection
-- =====================================================================

-- Step 1: Clean up existing duplicate open sessions
-- Keep only the most recent open session per visitor
WITH ranked_sessions AS (
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
  FROM ranked_sessions 
  WHERE rn > 1  -- Close all except the most recent
);

-- Step 2: Create unique partial index to prevent future duplicates
-- This ensures only ONE open session (time_out IS NULL) per visitor
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_open_session_per_visitor
ON visit_logs (visitor_id)
WHERE time_out IS NULL;

-- Step 3: Verify no duplicates exist
SELECT 
  visitor_id,
  COUNT(*) as open_sessions,
  STRING_AGG(id::TEXT, ', ') as session_ids
FROM visit_logs
WHERE time_out IS NULL
GROUP BY visitor_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- Step 4: Test the constraint
-- Try to insert duplicate open session (should fail)
-- DO $$
-- DECLARE
--   test_visitor_id UUID;
-- BEGIN
--   -- Get a visitor ID
--   SELECT id INTO test_visitor_id FROM visitors LIMIT 1;
--   
--   -- Insert first open session (should succeed)
--   INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
--   VALUES (test_visitor_id, 'Testing', NOW(), CURRENT_DATE);
--   
--   -- Try to insert second open session (should fail with unique constraint error)
--   INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
--   VALUES (test_visitor_id, 'Testing', NOW(), CURRENT_DATE);
--   
--   RAISE EXCEPTION 'Test failed - duplicate was allowed!';
-- EXCEPTION
--   WHEN unique_violation THEN
--     RAISE NOTICE 'SUCCESS: Duplicate prevented by unique constraint';
--     -- Clean up test data
--     DELETE FROM visit_logs WHERE visitor_id = test_visitor_id AND purpose = 'Testing';
-- END $$;

-- =====================================================================
-- Verification Queries
-- =====================================================================

-- Check if index exists
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'visit_logs'
  AND indexname = 'idx_one_open_session_per_visitor';
-- Expected: 1 row showing the unique index

-- Count current open sessions per visitor
SELECT 
  v.full_name,
  v.email,
  COUNT(*) as open_sessions
FROM visit_logs vl
JOIN visitors v ON v.id = vl.visitor_id
WHERE vl.time_out IS NULL
GROUP BY v.id, v.full_name, v.email
ORDER BY open_sessions DESC;
-- Expected: All counts should be 1

-- =====================================================================
-- Success Message
-- =====================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE indexname = 'idx_one_open_session_per_visitor'
    ) THEN '✅ SUCCESS: Unique constraint created - Duplicates now impossible at database level'
    ELSE '❌ FAILED: Index not created'
  END as status;
