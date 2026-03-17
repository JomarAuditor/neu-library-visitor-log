// =====================================================================
// NEU Library — TypeScript Type Definitions
// File: src/types/index.ts
// =====================================================================

export type VisitPurpose = 'Reading' | 'Research' | 'Studying' | 'Computer Use';
export type LoginMethod  = 'QR Code' | 'Email';
export type TimeFilter   = 'today' | 'week' | 'month' | 'year' | 'custom';
export type VisitorType  = 'Student' | 'Faculty' | 'Staff';

// ── Lookup tables ─────────────────────────────────────────────────────
export interface College {
  id:   number;
  name: string;
}

export interface Program {
  id:         number;
  college_id: number;
  name:       string;
  colleges?:  College;
}

// ── Core entities ─────────────────────────────────────────────────────
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
  program_id:     number | null;   // nullable for Faculty/Staff
  visitor_type:   VisitorType;     // Student | Faculty | Staff
  qr_code_data:   string | null;
  is_blocked:     boolean;
  created_at:     string;
  updated_at:     string;
  // Joined from Supabase .select() with nested relations
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
  time_out:         string | null;
  duration_minutes: number | null;
  date:             string;
  created_at:       string;
  // Joined
  students?: Student & {
    programs?: Program & { colleges: College };
  };
}

// ── Dashboard filters ─────────────────────────────────────────────────
export interface DashboardFilters {
  timeFilter:   'day' | 'week' | 'custom';
  dateFrom:     string;
  dateTo:       string;
  purpose:      string;     // '' = all, or specific purpose
  collegeId:    number | null;
  visitorType:  string;     // '' = all, or 'Student' | 'Faculty' | 'Staff'
}

// ── Stats ─────────────────────────────────────────────────────────────
export interface StatCards {
  today:      number;
  this_week:  number;
  this_month: number;
  this_year:  number;
}

export interface CollegeStat { college: string; count: number; }
export interface CourseStat  { course:  string; count: number; }

// ── Constants ─────────────────────────────────────────────────────────
export const PURPOSES: VisitPurpose[] = [
  'Reading', 'Research', 'Studying', 'Computer Use',
];

export const VISITOR_TYPES: VisitorType[] = ['Student', 'Faculty', 'Staff'];

export const PURPOSE_EMOJI: Record<VisitPurpose, string> = {
  'Reading':      '📖',
  'Research':     '🔬',
  'Studying':     '📚',
  'Computer Use': '💻',
};