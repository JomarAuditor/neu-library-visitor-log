// ── Enums / union types ────────────────────────────────────────────────────
export type VisitPurpose  = 'Reading' | 'Research' | 'Studying' | 'Computer Use';
export type LoginMethod   = 'QR Code' | 'Email';
export type TimeFilter    = 'today' | 'week' | 'month' | 'year' | 'custom';

// ── Database row types ─────────────────────────────────────────────────────
export interface Student {
  id:             string;
  email:          string;
  student_number: string;
  name:           string;
  college:        string;
  course:         string;
  qr_code_data:   string | null;
  is_blocked:     boolean;
  created_at:     string;
}

/** One row in visitor_logs.
 *  - time_in  : when the student ENTERED  (always set)
 *  - time_out : when the student LEFT     (null = currently inside)
 *  - duration_minutes: computed on time_out
 */
export interface VisitorLog {
  id:               string;
  student_id:       string;
  purpose:          VisitPurpose;
  login_method:     LoginMethod;
  time_in:          string;        // ISO timestamp
  time_out:         string | null; // ISO timestamp or null
  duration_minutes: number | null;
  date:             string;        // YYYY-MM-DD (date of time_in)
  created_at:       string;
  students?:        Student;       // joined
}

export interface Profile {
  id:         string;
  email:      string;
  full_name:  string;
  role:       'admin' | 'staff';
  created_at: string;
}

// ── Dashboard aggregates ───────────────────────────────────────────────────
export interface StatCards {
  today:      number;
  this_week:  number;
  this_month: number;
  this_year:  number;
}

export interface CollegeStat { college: string; count: number; }
export interface CourseStat  { course:  string; count: number; }

// ── Constants ─────────────────────────────────────────────────────────────
export const PURPOSES: VisitPurpose[] = [
  'Reading', 'Research', 'Studying', 'Computer Use',
];

export const COLLEGES = [
  'College of Computer Studies',
  'College of Engineering',
  'College of Medicine',
  'College of Business Administration',
  'College of Education',
  'College of Nursing',
  'College of Liberal Arts',
  'College of Criminology',
  'College of Tourism & Hospitality Management',
  'College of Architecture',
] as const;

export const COURSES = [
  'BSIT', 'BSCS', 'BSIS',
  'BSCE', 'BSEE', 'BSME',
  'BSN',
  'BSA', 'BSBA', 'BSHRM',
  'BEEd', 'BSEd',
  'BSCrim',
  'BSArch',
  'BSTM',
] as const;

export const PURPOSE_EMOJI: Record<VisitPurpose, string> = {
  'Reading':      '📖',
  'Research':     '🔬',
  'Studying':     '📚',
  'Computer Use': '💻',
};
