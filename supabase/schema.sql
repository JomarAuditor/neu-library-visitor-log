-- =====================================================================
-- NEU Library Visitor Log System
-- Normalized Database Schema (Third Normal Form - 3NF)
-- Version: 3.0  |  Run this FIRST in Supabase SQL Editor
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS visitor_logs CASCADE;
DROP TABLE IF EXISTS students     CASCADE;
DROP TABLE IF EXISTS programs     CASCADE;
DROP TABLE IF EXISTS colleges     CASCADE;
DROP TABLE IF EXISTS profiles     CASCADE;

-- colleges: lookup table for all NEU colleges
CREATE TABLE colleges (
  id         SMALLSERIAL  PRIMARY KEY,
  name       TEXT         UNIQUE NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE  colleges      IS 'Official NEU colleges and schools. Normalized lookup table.';
COMMENT ON COLUMN colleges.name IS 'Full official name e.g. College of Informatics and Computing Studies';

-- programs: each program belongs to exactly one college
CREATE TABLE programs (
  id         SMALLSERIAL  PRIMARY KEY,
  college_id SMALLINT     NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  name       TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_program_per_college UNIQUE (college_id, name)
);
COMMENT ON TABLE  programs            IS 'Academic programs/courses, each linked to exactly one college.';
COMMENT ON COLUMN programs.college_id IS 'FK to colleges. Enforces referential integrity.';
CREATE INDEX idx_programs_college ON programs(college_id);

-- profiles: admin/staff accounts linked to Supabase Auth
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  full_name  TEXT        NOT NULL DEFAULT 'Administrator',
  role       TEXT        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- students: registered library users
-- NORMALIZATION: college (TEXT) and course (TEXT) REMOVED, replaced by program_id FK
CREATE TABLE students (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          TEXT        UNIQUE NOT NULL,
  student_number TEXT        UNIQUE NOT NULL
                             CHECK (student_number ~ '^\d{2}-\d{5}-\d{3}$'),
  name           TEXT        NOT NULL,
  program_id     SMALLINT    NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
  qr_code_data   TEXT        UNIQUE,
  is_blocked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN students.program_id     IS 'FK to programs. Replaces old college + course text columns.';
COMMENT ON COLUMN students.student_number IS 'Format: YY-NNNNN-NNN (e.g. 24-13005-502)';
COMMENT ON COLUMN students.qr_code_data   IS 'Encoded as email|student_number. Used for QR scanning.';
COMMENT ON COLUMN students.is_blocked     IS 'TRUE = student cannot log library visits.';
CREATE INDEX idx_students_program ON students(program_id);
CREATE INDEX idx_students_email   ON students(email);
CREATE INDEX idx_students_sn      ON students(student_number);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- visitor_logs: one row = one library visit session
CREATE TABLE visitor_logs (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  purpose          TEXT        NOT NULL CHECK (purpose IN ('Reading','Research','Studying','Computer Use')),
  login_method     TEXT        NOT NULL CHECK (login_method IN ('QR Code','Email')),
  time_in          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_out         TIMESTAMPTZ NULL,
  duration_minutes INTEGER     NULL CHECK (duration_minutes >= 0),
  date             DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_timeout_after_timein CHECK (time_out IS NULL OR time_out > time_in)
);
COMMENT ON COLUMN visitor_logs.time_out         IS 'NULL = student is currently inside.';
COMMENT ON COLUMN visitor_logs.duration_minutes IS 'Computed when time_out is recorded.';
CREATE INDEX idx_logs_time_in      ON visitor_logs(time_in DESC);
CREATE INDEX idx_logs_date         ON visitor_logs(date DESC);
CREATE INDEX idx_logs_student_id   ON visitor_logs(student_id);
CREATE INDEX idx_logs_open_session ON visitor_logs(student_id) WHERE time_out IS NULL;

-- Row Level Security
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges     ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE students     ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_select"    ON profiles     FOR SELECT USING (auth.uid() = id);
CREATE POLICY "colleges_public_select" ON colleges     FOR SELECT USING (true);
CREATE POLICY "programs_public_select" ON programs     FOR SELECT USING (true);
CREATE POLICY "students_public_insert" ON students     FOR INSERT WITH CHECK (true);
CREATE POLICY "students_public_select" ON students     FOR SELECT USING (true);
CREATE POLICY "students_admin_update"  ON students     FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "logs_public_insert"     ON visitor_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "logs_public_select"     ON visitor_logs FOR SELECT USING (true);
CREATE POLICY "logs_public_update"     ON visitor_logs FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE visitor_logs;

-- Auto-create profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrator'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();