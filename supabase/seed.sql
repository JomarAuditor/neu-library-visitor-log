-- =====================================================================
-- NEU Library — Seed Data (run AFTER schema.sql)
-- =====================================================================

INSERT INTO colleges (name, abbreviation) VALUES
  ('College of Accountancy',                       'CA'),
  ('College of Agriculture',                       'CAg'),
  ('College of Arts and Sciences',                 'CAS'),
  ('College of Business Administration',           'CBA'),
  ('College of Communication',                     'CC'),
  ('College of Informatics and Computing Studies', 'CICS'),
  ('College of Criminology',                       'CCrim'),
  ('College of Education',                         'CEd'),
  ('College of Engineering and Architecture',      'CEA'),
  ('College of Medical Technology',                'CMT'),
  ('College of Midwifery',                         'CMid'),
  ('College of Music',                             'CM'),
  ('College of Nursing',                           'CN'),
  ('College of Physical Therapy',                  'CPT'),
  ('College of Respiratory Therapy',               'CRT'),
  ('School of International Relations',            'SIR');

DO $$
DECLARE col INT;
BEGIN
  SELECT id INTO col FROM colleges WHERE abbreviation='CA';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Accountancy','BSA'),
    (col,'Bachelor of Science in Accounting Information System','BSAIS');

  SELECT id INTO col FROM colleges WHERE abbreviation='CAg';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Agriculture','BSAg');

  SELECT id INTO col FROM colleges WHERE abbreviation='CAS';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Arts in Economics','BAEcon'),
    (col,'Bachelor of Arts in Political Science','BAPS'),
    (col,'Bachelor of Science in Biology','BSBio'),
    (col,'Bachelor of Science in Psychology','BSPsych'),
    (col,'Bachelor of Public Administration','BPA');

  SELECT id INTO col FROM colleges WHERE abbreviation='CBA';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'BSBA Major in Financial Management','BSBA-FM'),
    (col,'BSBA Major in Human Resource Development Management','BSBA-HRDM'),
    (col,'BSBA Major in Legal Management','BSBA-LM'),
    (col,'BSBA Major in Marketing Management','BSBA-MM'),
    (col,'Bachelor of Science in Entrepreneurship','BSEntrep'),
    (col,'Bachelor of Science in Real Estate Management','BSREM');

  SELECT id INTO col FROM colleges WHERE abbreviation='CC';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Arts in Broadcasting','BABroad'),
    (col,'Bachelor of Arts in Communication','BAComm'),
    (col,'Bachelor of Arts in Journalism','BAJ');

  SELECT id INTO col FROM colleges WHERE abbreviation='CICS';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Library and Information Science','BLIS'),
    (col,'Bachelor of Science in Computer Science','BSCS'),
    (col,'BSEMC - Digital Animation Technology','BSEMC-DAT'),
    (col,'BSEMC - Game Development','BSEMC-GD'),
    (col,'Bachelor of Science in Information Technology','BSIT'),
    (col,'Bachelor of Science in Information System','BSIS');

  SELECT id INTO col FROM colleges WHERE abbreviation='CCrim';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Criminology','BSCrim');

  SELECT id INTO col FROM colleges WHERE abbreviation='CEd';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Elementary Education','BEEd'),
    (col,'BEEd - Preschool Education','BEEd-PSE'),
    (col,'BEEd - Special Education','BEEd-SPED'),
    (col,'BSEd - MAPE','BSEd-MAPE'),
    (col,'BSEd - English','BSEd-Eng'),
    (col,'BSEd - Filipino','BSEd-Fil'),
    (col,'BSEd - Mathematics','BSEd-Math'),
    (col,'BSEd - Science','BSEd-Sci'),
    (col,'BSEd - Social Studies','BSEd-SS'),
    (col,'BSEd - TLE','BSEd-TLE');

  SELECT id INTO col FROM colleges WHERE abbreviation='CEA';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Architecture','BSArch'),
    (col,'Bachelor of Science in Astronomy','BSAstro'),
    (col,'Bachelor of Science in Civil Engineering','BSCE'),
    (col,'Bachelor of Science in Electrical Engineering','BSEE'),
    (col,'Bachelor of Science in Electronics Engineering','BSECE'),
    (col,'Bachelor of Science in Industrial Engineering','BSIE'),
    (col,'Bachelor of Science in Mechanical Engineering','BSME');

  SELECT id INTO col FROM colleges WHERE abbreviation='CMT';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Medical Technology','BSMT');

  SELECT id INTO col FROM colleges WHERE abbreviation='CMid';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Diploma in Midwifery','DipMid');

  SELECT id INTO col FROM colleges WHERE abbreviation='CM';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Music in Choral Conducting','BMus-CC'),
    (col,'Bachelor of Music in Music Education','BMus-ME'),
    (col,'Bachelor of Music in Piano','BMus-Piano'),
    (col,'Bachelor of Music in Voice','BMus-Voice');

  SELECT id INTO col FROM colleges WHERE abbreviation='CN';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Nursing','BSN');

  SELECT id INTO col FROM colleges WHERE abbreviation='CPT';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Physical Therapy','BSPT');

  SELECT id INTO col FROM colleges WHERE abbreviation='CRT';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Science in Respiratory Therapy','BSRT');

  SELECT id INTO col FROM colleges WHERE abbreviation='SIR';
  INSERT INTO programs(college_id,name,abbreviation) VALUES
    (col,'Bachelor of Arts in Foreign Service','BAFS');
END $$;

SELECT COUNT(*) AS colleges FROM colleges;
SELECT COUNT(*) AS programs FROM programs;