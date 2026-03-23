-- ============================================================================
-- TEST WITH JOMAR'S ACCOUNT - jomar.auditor@neu.edu.ph
-- ============================================================================
-- This script tests the smart toggle system with your account
-- ============================================================================

-- ============================================================================
-- STEP 1: FIND YOUR VISITOR ID
-- ============================================================================
SELECT 
  id as visitor_uuid,
  email,
  full_name,
  visitor_type,
  is_blocked
FROM visitors
WHERE email = 'jomar.auditor@neu.edu.ph';

-- ============================================================================
-- STEP 2: CHECK YOUR CURRENT SESSIONS
-- ============================================================================
SELECT 
  id,
  purpose,
  time_in,
  time_out,
  duration_minutes,
  CASE 
    WHEN time_out IS NULL THEN '🟢 INSIDE'
    ELSE '🔴 LEFT'
  END as status
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 10;

-- ============================================================================
-- STEP 3: CLEAN UP ANY DUPLICATE SESSIONS (IF NEEDED)
-- ============================================================================
-- Close all your active sessions (if you have multiple)
UPDATE visit_logs
SET 
  time_out = NOW(),
  duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
  AND time_out IS NULL;

-- Verify you have no active sessions now
SELECT COUNT(*) as active_sessions
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
  AND time_out IS NULL;
-- Should return 0

-- ============================================================================
-- STEP 4: TEST THE SMART TOGGLE FUNCTION
-- ============================================================================
-- Test 1: First time in (should create new session)
SELECT smart_time_in(
  (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph'),
  'Reading',
  NOW(),
  CURRENT_DATE
);

-- Check result (should show 1 active session)
SELECT 
  purpose,
  time_in,
  time_out,
  CASE WHEN time_out IS NULL THEN '🟢 INSIDE' ELSE '🔴 LEFT' END as status
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 3;

-- Test 2: Second time in (should close previous + create new)
SELECT smart_time_in(
  (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph'),
  'Computer Use',
  NOW(),
  CURRENT_DATE
);

-- Check result (should show 1 active session, previous one closed)
SELECT 
  purpose,
  time_in,
  time_out,
  duration_minutes,
  CASE WHEN time_out IS NULL THEN '🟢 INSIDE' ELSE '🔴 LEFT' END as status
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 3;

-- Test 3: Third time in (should close previous + create new)
SELECT smart_time_in(
  (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph'),
  'Studying',
  NOW(),
  CURRENT_DATE
);

-- Final check (should always show only 1 active session)
SELECT 
  purpose,
  time_in,
  time_out,
  duration_minutes,
  CASE WHEN time_out IS NULL THEN '🟢 INSIDE' ELSE '🔴 LEFT' END as status
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: VERIFY ONLY 1 ACTIVE SESSION
-- ============================================================================
SELECT 
  COUNT(*) as active_sessions,
  STRING_AGG(purpose, ', ') as purposes
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
  AND time_out IS NULL;
-- Should return: active_sessions = 1

-- ============================================================================
-- STEP 6: VIEW YOUR COMPLETE HISTORY
-- ============================================================================
SELECT 
  purpose,
  TO_CHAR(time_in, 'YYYY-MM-DD HH24:MI:SS') as time_in,
  TO_CHAR(time_out, 'YYYY-MM-DD HH24:MI:SS') as time_out,
  duration_minutes,
  CASE 
    WHEN time_out IS NULL THEN '🟢 Currently Inside'
    ELSE '✅ Completed'
  END as status
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 20;

-- ============================================================================
-- QUICK CLEANUP (IF NEEDED)
-- ============================================================================
-- If you want to close all your active sessions:
-- UPDATE visit_logs
-- SET time_out = NOW(), duration_minutes = 0
-- WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
--   AND time_out IS NULL;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ After Test 1: 1 active session (Reading)
-- ✅ After Test 2: 1 active session (Computer Use), previous closed
-- ✅ After Test 3: 1 active session (Studying), previous closed
-- ✅ Always: Only 1 active session per visitor
-- ✅ Dashboard: Shows correct "Currently Inside" count
-- ✅ Visitor Logs: Updates in real-time without refresh
