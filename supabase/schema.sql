-- =====================================================================
-- NEU Library Visitor Log System — Clean Schema v4
-- Run this FIRST in Supabase SQL Editor
-- =====================================================================

-- Drop old tables completely
DROP TABLE IF EXISTS visit_logs  CASCADE;
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS visitors    CASCADE;
DROP TABLE IF EXISTS students    CASCADE;
DROP TABLE IF EXISTS programs    CASCADE;
DROP TABLE IF EXISTS colleges    CASCADE;
DROP TABLE IF EXISTS profiles    CASCADE;

-- ── 1. profiles — admin accounts ─────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. colleges ───────────────────────────────────────────────────────
CREATE TABLE colleges (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  abbreviation TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. programs ───────────────────────────────────────────────────────
CREATE TABLE programs (
  id           SERIAL PRIMARY KEY,
  college_id   INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. visitors ───────────────────────────────────────────────────────
-- visitor_type: 'student' | 'faculty'
-- Students have college_id + program_id
-- Faculty have department (optional) + college_id (optional)
CREATE TABLE visitors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  full_name    TEXT NOT NULL,
  visitor_type TEXT NOT NULL CHECK (visitor_type IN ('student','faculty')),
  college_id   INT  REFERENCES colleges(id) ON DELETE SET NULL,
  program_id   INT  REFERENCES programs(id) ON DELETE SET NULL,
  department   TEXT,                    -- for faculty: e.g. "Instructor", "Dean"
  is_blocked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. visit_logs ─────────────────────────────────────────────────────
CREATE TABLE visit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id       UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  purpose          TEXT NOT NULL CHECK (purpose IN ('Reading','Research','Studying','Computer Use')),
  time_in          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out         TIMESTAMPTZ,
  duration_minutes INT,
  visit_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes for fast lookups ──────────────────────────────────────────
CREATE INDEX idx_visitors_email    ON visitors(email);
CREATE INDEX idx_visitors_type     ON visitors(visitor_type);
CREATE INDEX idx_visit_logs_date   ON visit_logs(visit_date);
CREATE INDEX idx_visit_logs_visitor ON visit_logs(visitor_id);
CREATE INDEX idx_visit_logs_open   ON visit_logs(visitor_id, time_out) WHERE time_out IS NULL;
CREATE INDEX idx_programs_college  ON programs(college_id);

-- ── Auto-update updated_at ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER visitors_updated_at
  BEFORE UPDATE ON visitors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-provision admin on first Google login ────────────────────────
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_list TEXT[] := ARRAY[
    'jcesperanza@neu.edu.ph',
    'jomar.auditor@neu.edu.ph'
  ];
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  IF lower(NEW.email) = ANY(admin_list) THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, lower(NEW.email), v_name, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── Fix existing admin users ──────────────────────────────────────────
DO $$
DECLARE r RECORD; v_name TEXT;
BEGIN
  FOR r IN SELECT id, email, raw_user_meta_data FROM auth.users
           WHERE lower(email) IN ('jcesperanza@neu.edu.ph','jomar.auditor@neu.edu.ph')
  LOOP
    v_name := COALESCE(r.raw_user_meta_data->>'full_name', r.raw_user_meta_data->>'name', split_part(r.email,'@',1));
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (r.id, lower(r.email), v_name, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name;
    RAISE NOTICE 'Admin set: %', r.email;
  END LOOP;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors   ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

-- Public read for colleges/programs (needed for registration dropdown)
CREATE POLICY "public_read_colleges" ON colleges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_programs" ON programs FOR SELECT TO anon, authenticated USING (true);

-- Visitors: anyone can insert (register), authenticated can read
CREATE POLICY "public_insert_visitors"  ON visitors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_select_visitors"  ON visitors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_update_visitors"   ON visitors FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- Visit logs: anyone can insert/update (time-in/out), admins can read all
CREATE POLICY "public_insert_logs" ON visit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_update_logs" ON visit_logs FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "admin_select_logs"  ON visit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- Profiles: own profile
CREATE POLICY "own_profile" ON profiles FOR ALL TO authenticated USING (auth.uid() = id);

-- ── Auto 6PM timeout (pg_cron) ────────────────────────────────────────
-- Enable pg_cron first: Database > Extensions > pg_cron
-- Then uncomment:
-- SELECT cron.schedule('neu_6pm_timeout','0 10 * * *',
--   $$ UPDATE visit_logs SET time_out=NOW(),
--      duration_minutes=EXTRACT(EPOCH FROM (NOW()-time_in))::INT/60
--      WHERE time_out IS NULL AND time_in < NOW(); $$);

SELECT 'Schema created successfully' AS status;