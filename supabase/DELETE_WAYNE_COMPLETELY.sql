-- ============================================================================
-- COMPLETELY DELETE WAYNE ANDY FROM SYSTEM
-- ============================================================================
-- This removes Wayne from:
-- 1. visit_logs (all his visit history)
-- 2. visitors (his visitor record)
-- 3. profiles (if he's an admin)
-- 4. auth.users (his authentication account)
-- ============================================================================

-- ============================================================================
-- STEP 1: FIND WAYNE'S IDs (FOR VERIFICATION)
-- ============================================================================
-- Find Wayne's visitor_id
SELECT 
  id as visitor_id,
  email,
  full_name,
  visitor_type,
  created_at
FROM visitors
WHERE email = 'wayne.andy@neu.edu.ph';

-- Find Wayne's auth user_id (if exists)
SELECT 
  id as auth_user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'wayne.andy@neu.edu.ph';

-- Find Wayne's profile (if he's an admin)
SELECT 
  id as profile_id,
  email,
  full_name,
  role
FROM profiles
WHERE email = 'wayne.andy@neu.edu.ph';

-- ============================================================================
-- STEP 2: DELETE ALL WAYNE'S VISIT LOGS
-- ============================================================================
-- This removes all his visit history from the dashboard
DELETE FROM visit_logs
WHERE visitor_id = (
  SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph'
);

-- Verify deletion (should return 0)
SELECT COUNT(*) as waynes_logs
FROM visit_logs
WHERE visitor_id = (
  SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph'
);

-- ============================================================================
-- STEP 3: DELETE WAYNE'S VISITOR RECORD
-- ============================================================================
-- This removes him from the visitors table
DELETE FROM visitors
WHERE email = 'wayne.andy@neu.edu.ph';

-- Verify deletion (should return 0)
SELECT COUNT(*) as waynes_visitor_record
FROM visitors
WHERE email = 'wayne.andy@neu.edu.ph';

-- ============================================================================
-- STEP 4: DELETE WAYNE'S PROFILE (IF HE'S AN ADMIN)
-- ============================================================================
-- This removes him from admin access
DELETE FROM profiles
WHERE email = 'wayne.andy@neu.edu.ph';

-- Verify deletion (should return 0)
SELECT COUNT(*) as waynes_profile
FROM profiles
WHERE email = 'wayne.andy@neu.edu.ph';

-- ============================================================================
-- STEP 5: DELETE WAYNE'S AUTHENTICATION ACCOUNT
-- ============================================================================
-- CRITICAL: This removes his Google OAuth account from Supabase Auth
-- He will need to register again from scratch

-- Option A: Using SQL (if you have admin privileges)
DELETE FROM auth.users
WHERE email = 'wayne.andy@neu.edu.ph';

-- Option B: If SQL doesn't work, use Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Search for "wayne.andy@neu.edu.ph"
-- 3. Click the three dots (...)
-- 4. Click "Delete User"
-- 5. Confirm deletion

-- Verify deletion (should return 0)
SELECT COUNT(*) as waynes_auth_account
FROM auth.users
WHERE email = 'wayne.andy@neu.edu.ph';

-- ============================================================================
-- STEP 6: FINAL VERIFICATION - WAYNE SHOULD BE COMPLETELY GONE
-- ============================================================================
-- Check all tables (all should return 0)

-- Visit logs
SELECT COUNT(*) as visit_logs_count
FROM visit_logs
WHERE visitor_id IN (SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph');

-- Visitors
SELECT COUNT(*) as visitors_count
FROM visitors
WHERE email = 'wayne.andy@neu.edu.ph';

-- Profiles
SELECT COUNT(*) as profiles_count
FROM profiles
WHERE email = 'wayne.andy@neu.edu.ph';

-- Auth users
SELECT COUNT(*) as auth_users_count
FROM auth.users
WHERE email = 'wayne.andy@neu.edu.ph';

-- All should return 0 rows

-- ============================================================================
-- ALTERNATIVE: DELETE MULTIPLE USERS AT ONCE
-- ============================================================================
-- If you want to delete multiple test accounts:

-- DELETE FROM visit_logs
-- WHERE visitor_id IN (
--   SELECT id FROM visitors 
--   WHERE email IN (
--     'wayne.andy@neu.edu.ph',
--     'shawn.david@neu.edu.ph',
--     'test.user@neu.edu.ph'
--   )
-- );

-- DELETE FROM visitors
-- WHERE email IN (
--   'wayne.andy@neu.edu.ph',
--   'shawn.david@neu.edu.ph',
--   'test.user@neu.edu.ph'
-- );

-- DELETE FROM profiles
-- WHERE email IN (
--   'wayne.andy@neu.edu.ph',
--   'shawn.david@neu.edu.ph',
--   'test.user@neu.edu.ph'
-- );

-- DELETE FROM auth.users
-- WHERE email IN (
--   'wayne.andy@neu.edu.ph',
--   'shawn.david@neu.edu.ph',
--   'test.user@neu.edu.ph'
-- );

-- ============================================================================
-- WHAT HAPPENS AFTER DELETION
-- ============================================================================
-- ✅ Wayne's email: wayne.andy@neu.edu.ph is completely removed
-- ✅ All his visit history is deleted
-- ✅ His visitor record is deleted
-- ✅ His admin profile is deleted (if he had one)
-- ✅ His Google OAuth account is deleted from Supabase
-- ✅ Dashboard "Currently Inside" count is updated
-- ✅ Visitor Logs no longer shows his records
-- ✅ User Management no longer shows his account

-- If Wayne tries to sign in again:
-- → System will treat him as a NEW USER
-- → He will be redirected to /register
-- → He can create a fresh account

-- ============================================================================
-- SUPABASE DASHBOARD METHOD (EASIER)
-- ============================================================================
-- If SQL doesn't work for auth.users, use Supabase Dashboard:

-- 1. Delete Authentication Account:
--    - Go to: Authentication → Users
--    - Search: wayne.andy@neu.edu.ph
--    - Click: Three dots (...) → Delete User
--    - Confirm: Yes, delete this user

-- 2. Delete Visitor Record:
--    - Go to: Table Editor → visitors
--    - Search: wayne.andy@neu.edu.ph
--    - Click: Row → Delete
--    - Confirm: Yes

-- 3. Delete Visit Logs:
--    - Go to: Table Editor → visit_logs
--    - Filter: visitor_id = (Wayne's UUID)
--    - Select all rows → Delete
--    - Confirm: Yes

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ All queries return 0 rows
-- ✅ Dashboard no longer shows Wayne's data
-- ✅ Visitor Logs no longer shows Wayne's records
-- ✅ User Management no longer shows Wayne's account
-- ✅ Wayne cannot sign in (will be treated as new user)
-- ✅ "Currently Inside" count is accurate
