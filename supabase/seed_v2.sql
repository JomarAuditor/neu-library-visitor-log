-- =====================================================================
-- NEU Library — Updated Seed Data (Correct Colleges & Programs)
-- Run this in Supabase SQL Editor
-- =====================================================================

-- Add job_title column for staff (if not exists)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS job_title TEXT;
-- Add department column for faculty (if not exists)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS department TEXT;

-- Clear old data
TRUNCATE colleges CASCADE;  -- also clears programs via CASCADE

-- ── Colleges ─────────────────────────────────────────────────────────
INSERT INTO colleges (name, abbreviation) VALUES
  ('College of Accountancy',              'CA'),
  ('College of Agriculture',              'CAg'),
  ('College of Arts and Sciences',        'CAS'),
  ('College of Business Administration',  'CBA'),
  ('College of Communication',            'CC'),
  ('College of Informatics and Computing Studies', 'CICS'),
  ('College of Criminology',              'CCrim'),
  ('College of Education',                'CEd'),
  ('College of Engineering and Architecture', 'CEA'),
  ('College of Medical Technology',       'CMT'),
  ('College of Midwifery',                'CMid'),
  ('College of Music',                    'CM'),
  ('College of Nursing',                  'CN'),
  ('College of Physical Therapy',         'CPT'),
  ('College of Respiratory Therapy',      'CRT'),
  ('School of International Relations',   'SIR');

-- ── Programs ─────────────────────────────────────────────────────────
DO $$
DECLARE col_id INT;
BEGIN
  -- College of Accountancy
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CA';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Accountancy',                    'BSA'),
    (col_id, 'Bachelor of Science in Accounting Information System',  'BSAIS');

  -- College of Agriculture
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CAg';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Agriculture', 'BSAg');

  -- College of Arts and Sciences
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CAS';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Arts in Economics',         'BAEcon'),
    (col_id, 'Bachelor of Arts in Political Science', 'BAPS'),
    (col_id, 'Bachelor of Science in Biology',        'BSBio'),
    (col_id, 'Bachelor of Science in Psychology',     'BSPsych'),
    (col_id, 'Bachelor of Public Administration',     'BPA');

  -- College of Business Administration
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CBA';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'BSBA Major in Financial Management',              'BSBA-FM'),
    (col_id, 'BSBA Major in Human Resource Development Mgmt',  'BSBA-HRDM'),
    (col_id, 'BSBA Major in Legal Management',                 'BSBA-LM'),
    (col_id, 'BSBA Major in Marketing Management',             'BSBA-MM'),
    (col_id, 'Bachelor of Science in Entrepreneurship',        'BSEntrep'),
    (col_id, 'Bachelor of Science in Real Estate Management',  'BSREM');

  -- College of Communication
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CC';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Arts in Broadcasting',   'BABroad'),
    (col_id, 'Bachelor of Arts in Communication',  'BAComm'),
    (col_id, 'Bachelor of Arts in Journalism',     'BAJ');

  -- College of Informatics and Computing Studies
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CICS';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Library and Information Science',          'BLIS'),
    (col_id, 'Bachelor of Science in Computer Science',             'BSCS'),
    (col_id, 'BSEMC with Spec. in Digital Animation Technology',    'BSEMC-DAT'),
    (col_id, 'BSEMC with Spec. in Game Development',               'BSEMC-GD'),
    (col_id, 'Bachelor of Science in Information Technology',       'BSIT'),
    (col_id, 'Bachelor of Science in Information System',           'BSIS');

  -- College of Criminology
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CCrim';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Criminology', 'BSCrim');

  -- College of Education
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CEd';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Elementary Education',                            'BEEd'),
    (col_id, 'BEEd with Specialization in Preschool Education',            'BEEd-PSE'),
    (col_id, 'BEEd with Specialization in Special Education',              'BEEd-SPED'),
    (col_id, 'BSEd Major in Music, Arts, and Physical Education',          'BSEd-MAPE'),
    (col_id, 'BSEd Major in English',                                      'BSEd-Eng'),
    (col_id, 'BSEd Major in Filipino',                                     'BSEd-Fil'),
    (col_id, 'BSEd Major in Mathematics',                                  'BSEd-Math'),
    (col_id, 'BSEd Major in Science',                                      'BSEd-Sci'),
    (col_id, 'BSEd Major in Social Studies',                               'BSEd-SS'),
    (col_id, 'BSEd Major in Technology and Livelihood Education',          'BSEd-TLE');

  -- College of Engineering and Architecture
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CEA';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Architecture',         'BSArch'),
    (col_id, 'Bachelor of Science in Astronomy',           'BSAstro'),
    (col_id, 'Bachelor of Science in Civil Engineering',   'BSCE'),
    (col_id, 'Bachelor of Science in Electrical Engineering','BSEE'),
    (col_id, 'Bachelor of Science in Electronics Engineering','BSECE'),
    (col_id, 'Bachelor of Science in Industrial Engineering','BSIE'),
    (col_id, 'Bachelor of Science in Mechanical Engineering','BSME');

  -- College of Medical Technology
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CMT';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Medical Technology', 'BSMT');

  -- College of Midwifery
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CMid';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Diploma in Midwifery', 'DipMid');

  -- College of Music
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CM';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Music in Choral Conducting', 'BMus-CC'),
    (col_id, 'Bachelor of Music in Music Education',   'BMus-ME'),
    (col_id, 'Bachelor of Music in Piano',             'BMus-Piano'),
    (col_id, 'Bachelor of Music in Voice',             'BMus-Voice');

  -- College of Nursing
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CN';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Nursing', 'BSN');

  -- College of Physical Therapy
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CPT';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Physical Therapy', 'BSPT');

  -- College of Respiratory Therapy
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'CRT';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Science in Respiratory Therapy', 'BSRT');

  -- School of International Relations
  SELECT id INTO col_id FROM colleges WHERE abbreviation = 'SIR';
  INSERT INTO programs (college_id, name, abbreviation) VALUES
    (col_id, 'Bachelor of Arts in Foreign Service', 'BAFS');
END $$;

-- ── Auto 6PM timeout using pg_cron ───────────────────────────────────
-- Requires pg_cron extension. Enable in Supabase Dashboard:
-- Database → Extensions → pg_cron → Enable
-- Then run:

SELECT cron.unschedule('neu_library_auto_timeout') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'neu_library_auto_timeout'
);

SELECT cron.schedule(
  'neu_library_auto_timeout',
  '0 10 * * *',   -- 10:00 UTC = 18:00 PHT (UTC+8)
  $$
    UPDATE visit_logs
    SET
      time_out         = NOW(),
      duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in))::INT / 60
    WHERE
      time_out  IS NULL
      AND time_in < NOW();
  $$
);

-- Verify
SELECT COUNT(*) AS colleges FROM colleges;
SELECT COUNT(*) AS programs FROM programs;