-- =====================================================================
-- NEU Library Visitor Log System
-- Professor Setup & Google OAuth Migration
-- Run this in Supabase SQL Editor
-- =====================================================================
-- WHAT THIS DOES:
--   PART A: Adds visitor_type column (Student/Faculty/Staff)
--   PART B: Makes program_id optional for Faculty/Staff
--   PART C: Fixes the auto-profile trigger (security fix)
--   PART D: Creates professor's admin profile
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- PART A: Add visitor_type column to students
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS visitor_type TEXT
    NOT NULL DEFAULT 'Student'
    CHECK (visitor_type IN ('Student', 'Faculty', 'Staff'));

COMMENT ON COLUMN students.visitor_type IS
  'Student = enrolled student, Faculty = teacher/professor, Staff = non-teaching employee';

-- ─────────────────────────────────────────────────────────────────────
-- PART B: Make program_id optional (Faculty/Staff don't have programs)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE students
  ALTER COLUMN program_id DROP NOT NULL;

-- Also relax the student_number CHECK so Faculty/Staff can use employee IDs
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_student_number_check;

-- ─────────────────────────────────────────────────────────────────────
-- PART C: Fix the auto-profile trigger (SECURITY FIX)
-- The old trigger gave EVERY new sign-in an admin profile automatically.
-- That was a security risk. Now profiles must be manually granted.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DO NOT auto-create admin profiles.
  -- Admin profiles must be manually created via SQL.
  -- This prevents unauthorized Google sign-ins from getting admin access.
  RETURN NEW;
END;
$$;

-- The trigger stays active but now does nothing (safe)

-- ─────────────────────────────────────────────────────────────────────
-- PART D: Set up professor's admin profile
-- ─────────────────────────────────────────────────────────────────────
-- IMPORTANT: Run this AFTER the professor has signed in with Google
-- at /admin/login at least once. That creates their auth.users row.
-- Then run THIS to grant them admin access.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- Look up professor by email in Supabase Auth
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'jcesperanza@neu.edu.ph'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE '⚠️  Professor has NOT signed in yet.';
    RAISE NOTICE '   Ask the professor to go to /admin/login and click "Sign in with Google" first.';
    RAISE NOTICE '   Then come back and run this SQL again.';
    RETURN;
  END IF;

  -- Grant admin profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    v_uid,
    'jcesperanza@neu.edu.ph',
    'Prof. J. Cesperanza',
    'admin'
  )
  ON CONFLICT (id) DO UPDATE
    SET role      = 'admin',
        full_name = 'Prof. J. Cesperanza';

  RAISE NOTICE '✅  SUCCESS! Admin profile created for jcesperanza@neu.edu.ph';
  RAISE NOTICE '   Professor can now access /admin/dashboard';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- VERIFY: Check the result
-- ─────────────────────────────────────────────────────────────────────
SELECT
  u.email,
  p.full_name,
  p.role,
  u.created_at AS signed_up_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'jcesperanza@neu.edu.ph';

-- Also verify visitor_type was added:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'visitor_type';