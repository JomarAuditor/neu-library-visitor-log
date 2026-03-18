-- =====================================================================
-- NEU Library Visitor Log System — Complete Database Schema
-- Normalized to 3NF. Run in Supabase SQL Editor.
-- =====================================================================

-- ── Drop old tables (if resetting) ───────────────────────────────────
DROP TABLE IF EXISTS visit_logs      CASCADE;
DROP TABLE IF EXISTS visitors        CASCADE;
DROP TABLE IF EXISTS programs        CASCADE;
DROP TABLE IF EXISTS colleges        CASCADE;
DROP TABLE IF EXISTS profiles        CASCADE;

-- ── 1. profiles — admin/staff accounts (from auth.users) ─────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. colleges ───────────────────────────────────────────────────────
CREATE TABLE colleges (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. programs (normalized: each belongs to one college) ────────────
CREATE TABLE programs (
  id           SERIAL PRIMARY KEY,
  college_id   INT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  abbreviation TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. visitors — all people who can use the library ─────────────────
-- visitor_type:
--   student → has student_number + program_id
--   faculty → no student_number, has college_id (optional), no program
--   staff   → no student_number, no college, no program
CREATE TABLE visitors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  visitor_type   TEXT NOT NULL DEFAULT 'student'
                 CHECK (visitor_type IN ('student','faculty','staff')),
  student_number TEXT UNIQUE,              -- only for students
  program_id     INT REFERENCES programs(id) ON DELETE SET NULL, -- only for students
  college_id     INT REFERENCES colleges(id) ON DELETE SET NULL, -- optional for faculty
  qr_data        TEXT,                     -- encoded QR string for kiosk scan
  is_blocked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. visit_logs — one row per library visit ─────────────────────────
CREATE TABLE visit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id       UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  purpose          TEXT NOT NULL CHECK (purpose IN ('Reading','Research','Studying','Computer Use')),
  login_method     TEXT NOT NULL DEFAULT 'QR Code' CHECK (login_method IN ('QR Code','Email','Google')),
  time_in          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out         TIMESTAMPTZ,
  duration_minutes INT,
  visit_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes for performance ───────────────────────────────────────────
CREATE INDEX idx_visitors_email      ON visitors(email);
CREATE INDEX idx_visitors_type       ON visitors(visitor_type);
CREATE INDEX idx_visit_logs_date     ON visit_logs(visit_date);
CREATE INDEX idx_visit_logs_visitor  ON visit_logs(visitor_id);
CREATE INDEX idx_visit_logs_time_in  ON visit_logs(time_in);
CREATE INDEX idx_programs_college    ON programs(college_id);

-- ── Auto-update updated_at on visitors ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-provision admin profiles on Google sign-in ──────────────────
-- These emails automatically become admin on first Google login.
-- Add more emails to the array as needed.
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
    INSERT INTO public.profiles (id, email, full_name, role, created_at)
    VALUES (NEW.id, lower(NEW.email), v_name, 'admin', NOW())
    ON CONFLICT (id) DO UPDATE
      SET role = 'admin', full_name = EXCLUDED.full_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── Grant admin to existing users (run after schema creation) ─────────
DO $$
DECLARE r RECORD; v_name TEXT;
BEGIN
  FOR r IN
    SELECT id, email, raw_user_meta_data
    FROM auth.users
    WHERE lower(email) IN ('jcesperanza@neu.edu.ph','jomar.auditor@neu.edu.ph')
  LOOP
    v_name := COALESCE(
      r.raw_user_meta_data->>'full_name',
      r.raw_user_meta_data->>'name',
      split_part(r.email, '@', 1)
    );
    INSERT INTO public.profiles (id, email, full_name, role, created_at)
    VALUES (r.id, lower(r.email), v_name, 'admin', NOW())
    ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = EXCLUDED.full_name;
    RAISE NOTICE 'Admin granted to: %', r.email;
  END LOOP;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors   ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges   ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs   ENABLE ROW LEVEL SECURITY;

-- profiles: users see only their own; admins see all
CREATE POLICY "own profile" ON profiles FOR ALL TO authenticated USING (auth.uid() = id);

-- colleges + programs: public read (needed for registration form)
CREATE POLICY "public read colleges" ON colleges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read programs" ON programs FOR SELECT TO anon, authenticated USING (true);

-- visitors: public read + insert (for registration); update by admin only
CREATE POLICY "public read visitors"   ON visitors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public insert visitors" ON visitors FOR INSERT  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin update visitors"  ON visitors FOR UPDATE  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- visit_logs: public insert (anyone can check in); select/update by admin
CREATE POLICY "public insert logs"  ON visit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public update logs"  ON visit_logs FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "admin read logs"     ON visit_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','staff')));

-- Final verify
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;