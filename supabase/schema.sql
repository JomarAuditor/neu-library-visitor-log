-- =====================================================================
-- NEU Library Visitor Log System — Complete Database Schema
-- =====================================================================
-- HOW TO USE:
--   1. Go to your Supabase project
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "New query"
--   4. Paste this ENTIRE file into the editor
--   5. Click "Run"
--   You should see: "Success. No rows returned."
-- =====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old tables (safe for first-time setup)
DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS students     CASCADE;
DROP TABLE IF EXISTS profiles     CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 1: profiles
-- Linked to Supabase Auth users. Stores admin accounts.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT         NOT NULL,
  full_name   TEXT         NOT NULL DEFAULT 'Administrator',
  role        TEXT         NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 2: students
-- Registered library users. No student data is pre-inserted.
-- Students register themselves at /register.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE students (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT         UNIQUE NOT NULL,
  student_number  TEXT         UNIQUE NOT NULL,
  name            TEXT         NOT NULL,
  college         TEXT         NOT NULL,
  course          TEXT         NOT NULL,
  qr_code_data    TEXT         UNIQUE,
  is_blocked      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- TABLE 3: visitor_logs
-- Records every library visit.
-- 
-- TIME IN / TIME OUT LOGIC:
--   • When a student first scans/logs in  → INSERT a new row
--       time_in  = NOW()
--       time_out = NULL          (student is currently inside)
--
--   • When the same student scans/logs in again
--     and an open row exists (time_out IS NULL)
--     → UPDATE that row:
--       time_out         = NOW()
--       duration_minutes = DATEDIFF(time_out, time_in)
--
--   • "Currently inside" = rows WHERE time_out IS NULL
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE visitor_logs (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  purpose          TEXT         NOT NULL CHECK (purpose IN ('Reading','Research','Studying','Computer Use')),
  login_method     TEXT         NOT NULL CHECK (login_method IN ('QR Code','Email')),
  time_in          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  time_out         TIMESTAMPTZ  NULL,                       -- NULL = student still inside
  duration_minutes INTEGER      NULL CHECK (duration_minutes >= 0),
  date             DATE         NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- Indexes for fast queries
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_logs_time_in    ON visitor_logs (time_in DESC);
CREATE INDEX idx_logs_date       ON visitor_logs (date DESC);
CREATE INDEX idx_logs_student    ON visitor_logs (student_id);
CREATE INDEX idx_logs_time_out   ON visitor_logs (time_out) WHERE time_out IS NULL;
CREATE INDEX idx_students_email  ON students (email);
CREATE INDEX idx_students_sn     ON students (student_number);

-- ─────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- profiles: only the owner can see their own profile
CREATE POLICY "Own profile only"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- students: public registration (INSERT), anyone can read (for lookup), admins can update
CREATE POLICY "Public register"
  ON students FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone read students"
  ON students FOR SELECT
  USING (true);

CREATE POLICY "Admins update students"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- visitor_logs: public INSERT (log visit), public SELECT (dashboard queries), public UPDATE (time out)
CREATE POLICY "Public log visit"
  ON visitor_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone read logs"
  ON visitor_logs FOR SELECT
  USING (true);

CREATE POLICY "Public update time out"
  ON visitor_logs FOR UPDATE
  USING (true);

-- ─────────────────────────────────────────────────────────────────────
-- Enable Realtime on visitor_logs
-- (Dashboard auto-updates without page refresh)
-- ─────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE visitor_logs;

-- ─────────────────────────────────────────────────────────────────────
-- Auto-create profile row when a new Auth user signs up
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrator'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- DONE. Now run seed.sql to create the admin account.
-- =====================================================================
