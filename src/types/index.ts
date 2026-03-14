// =====================================================================
// NEU Library Visitor Log System
// TypeScript Type Definitions — Normalized Schema (3NF)
// File: src/types/index.ts
// =====================================================================

export type VisitPurpose = 'Reading' | 'Research' | 'Studying' | 'Computer Use';
export type LoginMethod  = 'QR Code' | 'Email';
export type TimeFilter   = 'today' | 'week' | 'month' | 'year' | 'custom';

// ── Normalized lookup tables ───────────────────────────────────────────
export interface College {
  id:          number;
  name:        string;
  created_at?: string;
}

export interface Program {
  id:          number;
  college_id:  number;
  name:        string;
  created_at?: string;
  // Populated when fetched with join: .select('*, colleges(*)')
  colleges?:   College;
}

// ── Core entities ──────────────────────────────────────────────────────
export interface Profile {
  id:         string;
  email:      string;
  full_name:  string;
  role:       'admin' | 'staff';
  created_at: string;
}

export interface Student {
  id:             string;
  email:          string;
  student_number: string;
  name:           string;
  program_id:     number;        // FK to programs (replaces old college + course text)
  qr_code_data:   string | null;
  is_blocked:     boolean;
  created_at:     string;
  updated_at:     string;
  // Populated when fetched with nested join:
  // .select('*, programs(*, colleges(*))')
  programs?: Program & {
    colleges: College;
  };
}

export interface VisitorLog {
  id:               string;
  student_id:       string;
  purpose:          VisitPurpose;
  login_method:     LoginMethod;
  time_in:          string;
  time_out:         string | null;  // NULL = student currently inside
  duration_minutes: number | null;  // NULL until time_out is recorded
  date:             string;
  created_at:       string;
  // Populated with nested join:
  // .select('*, students(*, programs(*, colleges(*)))')
  students?: Student & {
    programs: Program & { colleges: College };
  };
}

// ── Dashboard statistics ───────────────────────────────────────────────
export interface StatCards {
  today:      number;
  this_week:  number;
  this_month: number;
  this_year:  number;
}

export interface CollegeStat { college: string; count: number; }
export interface CourseStat  { course:  string; count: number; }

// ── Constants ──────────────────────────────────────────────────────────
export const PURPOSES: VisitPurpose[] = [
  'Reading', 'Research', 'Studying', 'Computer Use',
];

export const PURPOSE_EMOJI: Record<VisitPurpose, string> = {
  'Reading':      '📖',
  'Research':     '🔬',
  'Studying':     '📚',
  'Computer Use': '💻',
};