-- ============================================================================
-- ENABLE REAL-TIME FOR DELETE OPERATIONS
-- ============================================================================
-- This ensures the dashboard updates immediately when Wayne is deleted
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE REPLICA IDENTITY FULL (REQUIRED FOR DELETE EVENTS)
-- ============================================================================
-- This allows Supabase Realtime to broadcast DELETE events with full row data

ALTER TABLE visit_logs REPLICA IDENTITY FULL;
ALTER TABLE visitors REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Verify replica identity is set to FULL
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN replica_identity = 'f' THEN '✅ FULL (DELETE events work)'
    WHEN replica_identity = 'd' THEN '⚠️ DEFAULT (DELETE events limited)'
    ELSE '❌ NOTHING (DELETE events broken)'
  END as realtime_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename IN ('visit_logs', 'visitors', 'profiles')
  AND schemaname = 'public';

-- All should show "✅ FULL"

-- ============================================================================
-- STEP 2: VERIFY REALTIME IS ENABLED IN SUPABASE DASHBOARD
-- ============================================================================
-- Go to: Database → Replication
-- Ensure these tables have replication enabled:
-- ✅ visit_logs
-- ✅ visitors
-- ✅ profiles

-- ============================================================================
-- STEP 3: DELETE WAYNE AND FORCE REFRESH
-- ============================================================================
-- Delete Wayne completely
DELETE FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph');

DELETE FROM visitors WHERE email = 'wayne.andy@neu.edu.ph';
DELETE FROM profiles WHERE email = 'wayne.andy@neu.edu.ph';
DELETE FROM auth.users WHERE email = 'wayne.andy@neu.edu.ph';

-- ============================================================================
-- STEP 4: VERIFY WAYNE IS GONE
-- ============================================================================
SELECT 
  (SELECT COUNT(*) FROM visit_logs WHERE visitor_id IN (SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph')) as logs,
  (SELECT COUNT(*) FROM visitors WHERE email = 'wayne.andy@neu.edu.ph') as visitor,
  (SELECT COUNT(*) FROM profiles WHERE email = 'wayne.andy@neu.edu.ph') as profile,
  (SELECT COUNT(*) FROM auth.users WHERE email = 'wayne.andy@neu.edu.ph') as auth;
-- All should be 0

-- ============================================================================
-- STEP 5: CHECK CURRENT "INSIDE" COUNT
-- ============================================================================
SELECT COUNT(*) as currently_inside
FROM visit_logs
WHERE time_out IS NULL;

-- This should match what the dashboard shows after refresh

-- ============================================================================
-- TROUBLESHOOTING: IF DASHBOARD STILL SHOWS WAYNE
-- ============================================================================

-- Option 1: Hard refresh the browser
-- Press: Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)

-- Option 2: Clear browser cache
-- Press F12 → Application → Clear Storage → Clear site data

-- Option 3: Check if Realtime is actually connected
-- Open browser console (F12) and look for:
-- "Realtime subscribed: visit_logs"
-- "Realtime subscribed: visitors"

-- Option 4: Manually trigger a dummy update to force refresh
UPDATE visit_logs
SET duration_minutes = duration_minutes
WHERE id = (SELECT id FROM visit_logs ORDER BY time_in DESC LIMIT 1);

-- This will trigger the Realtime subscription and force dashboard refresh

-- ============================================================================
-- STEP 6: TEST REALTIME IS WORKING
-- ============================================================================
-- Open the dashboard in your browser
-- Run this query in Supabase SQL Editor:

UPDATE visit_logs
SET duration_minutes = 999
WHERE id = (SELECT id FROM visit_logs ORDER BY time_in DESC LIMIT 1);

-- The dashboard should update within 2 seconds showing the change
-- If it doesn't update, Realtime is not working

-- Reset the test:
UPDATE visit_logs
SET duration_minutes = EXTRACT(EPOCH FROM (time_out - time_in)) / 60
WHERE duration_minutes = 999;

-- ============================================================================
-- ALTERNATIVE: FORCE IMMEDIATE DASHBOARD REFRESH
-- ============================================================================
-- If Realtime is not working, the dashboard has aggressive polling every 2 seconds
-- Just wait 2 seconds and it should update automatically

-- You can also click the "Refresh" button in the dashboard to force immediate update

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ Wayne deleted from database (all queries return 0)
-- ✅ Dashboard updates within 2 seconds (no manual refresh needed)
-- ✅ "Currently Inside" count is accurate
-- ✅ Visitor Logs no longer shows Wayne
-- ✅ User Management no longer shows Wayne
-- ✅ Browser console shows "Realtime subscribed" messages
