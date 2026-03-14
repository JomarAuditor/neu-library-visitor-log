-- =====================================================================
-- NEU Library Visitor Log System
-- Seed Data: All Colleges, Programs, and Admin Account
-- Run this SECOND, after schema.sql
-- =====================================================================

-- All NEU Colleges
INSERT INTO colleges (name) VALUES
  ('College of Accountancy'),
  ('College of Agriculture'),
  ('College of Arts and Sciences'),
  ('College of Business Administration'),
  ('College of Communication'),
  ('College of Informatics and Computing Studies'),
  ('College of Criminology'),
  ('College of Education'),
  ('College of Engineering and Architecture'),
  ('College of Medical Technology'),
  ('College of Midwifery'),
  ('College of Music'),
  ('College of Nursing'),
  ('College of Physical Therapy'),
  ('College of Respiratory Therapy'),
  ('School of International Relations')
ON CONFLICT (name) DO NOTHING;

-- All Programs linked to their colleges
INSERT INTO programs (college_id, name)
SELECT c.id, p.name
FROM (VALUES
  -- College of Accountancy
  ('College of Accountancy', 'Bachelor of Science in Accountancy'),
  ('College of Accountancy', 'Bachelor of Science in Accounting Information System'),
  -- College of Agriculture
  ('College of Agriculture', 'Bachelor of Science in Agriculture'),
  -- College of Arts and Sciences
  ('College of Arts and Sciences', 'Bachelor of Arts in Economics'),
  ('College of Arts and Sciences', 'Bachelor of Arts in Political Science'),
  ('College of Arts and Sciences', 'Bachelor of Science in Biology'),
  ('College of Arts and Sciences', 'Bachelor of Science in Psychology'),
  ('College of Arts and Sciences', 'Bachelor of Public Administration'),
  -- College of Business Administration
  ('College of Business Administration', 'Bachelor of Science in Business Administration Major in Financial Management'),
  ('College of Business Administration', 'Bachelor of Science in Business Administration Major in Human Resource Development Management'),
  ('College of Business Administration', 'Bachelor of Science in Business Administration Major in Legal Management'),
  ('College of Business Administration', 'Bachelor of Science in Business Administration Major in Marketing Management'),
  ('College of Business Administration', 'Bachelor of Science in Entrepreneurship'),
  ('College of Business Administration', 'Bachelor of Science in Real Estate Management'),
  -- College of Communication
  ('College of Communication', 'Bachelor of Arts in Broadcasting'),
  ('College of Communication', 'Bachelor of Arts in Communication'),
  ('College of Communication', 'Bachelor of Arts in Journalism'),
  -- College of Informatics and Computing Studies
  ('College of Informatics and Computing Studies', 'Bachelor of Library and Information Science'),
  ('College of Informatics and Computing Studies', 'Bachelor of Science in Computer Science'),
  ('College of Informatics and Computing Studies', 'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology'),
  ('College of Informatics and Computing Studies', 'Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development'),
  ('College of Informatics and Computing Studies', 'Bachelor of Science in Information Technology'),
  ('College of Informatics and Computing Studies', 'Bachelor of Science in Information System'),
  -- College of Criminology
  ('College of Criminology', 'Bachelor of Science in Criminology'),
  -- College of Education
  ('College of Education', 'Bachelor of Elementary Education'),
  ('College of Education', 'Bachelor of Elementary Education with Specialization in Preschool Education'),
  ('College of Education', 'Bachelor of Elementary Education with Specialization in Special Education'),
  ('College of Education', 'Bachelor of Secondary Education Major in Music, Arts, and Physical Education'),
  ('College of Education', 'Bachelor of Secondary Education Major in English'),
  ('College of Education', 'Bachelor of Secondary Education Major in Filipino'),
  ('College of Education', 'Bachelor of Secondary Education Major in Mathematics'),
  ('College of Education', 'Bachelor of Secondary Education Major in Science'),
  ('College of Education', 'Bachelor of Secondary Education Major in Social Studies'),
  ('College of Education', 'Bachelor of Secondary Education Major in Technology and Livelihood Education'),
  -- College of Engineering and Architecture
  ('College of Engineering and Architecture', 'Bachelor of Science in Architecture'),
  ('College of Engineering and Architecture', 'Bachelor of Science in Astronomy'),
  ('College of Engineering and Architecture', 'Bachelor of Science in Civil Engineering'),
  ('College of Engineering and Architecture', 'Bachelor of Science in Electrical Engineering'),
  ('College of Engineering and Architecture', 'Bachelor of Science in Electronics Engineering'),
  ('College of Engineering and Architecture', 'Bachelor of Science in Industrial Engineering'),
  ('College of Engineering and Architecture', 'Bachelor of Science in Mechanical Engineering'),
  -- College of Medical Technology
  ('College of Medical Technology', 'Bachelor of Science in Medical Technology'),
  -- College of Midwifery
  ('College of Midwifery', 'Diploma in Midwifery'),
  -- College of Music
  ('College of Music', 'Bachelor of Music in Choral Conducting'),
  ('College of Music', 'Bachelor of Music in Music Education'),
  ('College of Music', 'Bachelor of Music in Piano'),
  ('College of Music', 'Bachelor of Music in Voice'),
  -- College of Nursing
  ('College of Nursing', 'Bachelor of Science in Nursing'),
  -- College of Physical Therapy
  ('College of Physical Therapy', 'Bachelor of Science in Physical Therapy'),
  -- College of Respiratory Therapy
  ('College of Respiratory Therapy', 'Bachelor of Science in Respiratory Therapy'),
  -- School of International Relations
  ('School of International Relations', 'Bachelor of Arts in Foreign Service')
) AS p(college_name, name)
JOIN colleges c ON c.name = p.college_name
ON CONFLICT (college_id, name) DO NOTHING;

-- Admin profile
-- IMPORTANT: First go to Supabase Dashboard > Authentication > Users > Add user
--   Email:    admin@neu.edu.ph
--   Password: NEULibrary@2026
--   Check "Auto Confirm User"
-- Then run this block:
DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@neu.edu.ph' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_user_id, 'admin@neu.edu.ph', 'Library Administrator', 'admin')
    ON CONFLICT (id) DO UPDATE SET full_name = 'Library Administrator', role = 'admin';
    RAISE NOTICE 'SUCCESS - Admin profile ready. User ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'WARNING - No user found with admin@neu.edu.ph. Create auth user first, then re-run.';
  END IF;
END $$;

SELECT 'Colleges inserted:' AS info, COUNT(*) AS total FROM colleges;
SELECT 'Programs inserted:' AS info, COUNT(*) AS total FROM programs;