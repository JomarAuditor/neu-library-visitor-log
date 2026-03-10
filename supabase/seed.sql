-- =====================================================================
-- NEU Library Visitor Log System — Seed (Admin Only)
-- =====================================================================
--
-- ⚠️  RUN THIS AFTER schema.sql
--
-- STEP 1 — Create the admin user in Supabase Auth:
--   Supabase Dashboard → Authentication → Users → Add user
--   Email:    admin@neu.edu.ph
--   Password: NEULibrary@2024
--   ✅ Auto Confirm User  (check this box)
--   → Click "Create user"
--
-- STEP 2 — Run this SQL in SQL Editor → New query
-- =====================================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- Find the admin user that was created in Supabase Auth
  SELECT id INTO v_uid
  FROM auth.users
  WHERE email = 'admin@neu.edu.ph'
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION
      'Admin user not found in Supabase Auth. '
      'Please create it first: Authentication → Users → Add user '
      '(email: admin@neu.edu.ph, password: NEULibrary@2024, Auto Confirm ✓)';
  END IF;

  -- Upsert the profile row
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_uid, 'admin@neu.edu.ph', 'Library Administrator', 'admin')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role      = EXCLUDED.role;

  RAISE NOTICE 'SUCCESS — Admin profile ready for user: %', v_uid;
END;
$$;

-- =====================================================================
-- After running this seed you can log in at /admin/login:
--
--   Email:    admin@neu.edu.ph
--   Password: NEULibrary@2024
--
-- ⚠️  Change the password after first login!
--     Supabase → Authentication → Users → (click the user) → Reset password
-- =====================================================================
