-- ============================================================================
-- HOW TO GET VISITOR UUID AND TEST THE FUNCTION
-- ============================================================================

-- Step 1: Find Wayne's UUID
SELECT 
  id as visitor_uuid,
  email,
  full_name,
  visitor_type
FROM visitors
WHERE email = 'wayne.andy@neu.edu.ph';

-- Step 2: Copy the UUID from the result above and paste it below
-- Example: If the UUID is '123e4567-e89b-12d3-a456-426614174000'
-- Then run:

SELECT smart_time_in(
  '123e4567-e89b-12d3-a456-426614174000'::UUID,  -- Replace with actual UUID
  'Reading',
  NOW(),
  CURRENT_DATE
);

-- ============================================================================
-- EASIER WAY: Test with subquery (no copy-paste needed)
-- ============================================================================

SELECT smart_time_in(
  (SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph'),
  'Reading',
  NOW(),
  CURRENT_DATE
);

-- ============================================================================
-- VERIFY IT WORKED
-- ============================================================================

-- Check Wayne's current sessions
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
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 5;

-- ============================================================================
-- TEST WITH YOUR OWN ACCOUNT
-- ============================================================================

-- Find your UUID
SELECT 
  id as visitor_uuid,
  email,
  full_name
FROM visitors
WHERE email = 'jomar.auditor@neu.edu.ph';

-- Test with your account
SELECT smart_time_in(
  (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph'),
  'Computer Use',
  NOW(),
  CURRENT_DATE
);

-- Check your sessions
SELECT 
  purpose,
  time_in,
  time_out,
  CASE WHEN time_out IS NULL THEN '🟢 INSIDE' ELSE '🔴 LEFT' END as status
FROM visit_logs
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'jomar.auditor@neu.edu.ph')
ORDER BY time_in DESC
LIMIT 3;
