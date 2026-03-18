// =====================================================================
// NEU Library — TypeScript Types
// File: src/types/index.ts
// PLACE THIS AT: src/types/index.ts
// =====================================================================

// ── Enums ─────────────────────────────────────────────────────────────
export type VisitPurpose = 'Reading' | 'Research' | 'Studying' | 'Computer Use';
export type LoginMethod  = 'QR Code' | 'Email' | 'Google';
export type VisitorType  = 'student' | 'faculty' | 'staff';   // lowercase — matches DB
export type AdminRole    = 'admin'   | 'staff';
export type TimeFilter   = 'today'   | 'week'   | 'month' | 'custom';

// ── Lookup tables ─────────────────────────────────────────────────────
export interface College {
  id:           number;
  name:         string;
  abbreviation: string;
}

export interface Program {
  id:           number;
  college_id:   number;
  name:         string;
  abbreviation: string;
  colleges?:    College;
}

// ── Auth profile (admins only) ────────────────────────────────────────
export interface Profile {
  id:         string;
  email:      string;
  full_name:  string;
  role:       AdminRole;
  created_at: string;
}

// ── Visitor (replaces old Student interface) ──────────────────────────
export interface Visitor {
  id:             string;
  email:          string;
  full_name:      string;
  visitor_type:   VisitorType;
  student_number: string | null;
  program_id:     number | null;
  college_id:     number | null;
  qr_data:        string | null;
  is_blocked:     boolean;
  created_at:     string;
  updated_at:     string;
  // Joined relations
  programs?: Program & { colleges: College };
  colleges?: College;
}

// ── VisitLog (replaces old VisitorLog interface) ──────────────────────
export interface VisitLog {
  id:               string;
  visitor_id:       string;
  purpose:          VisitPurpose;
  login_method:     LoginMethod;
  time_in:          string;
  time_out:         string | null;
  duration_minutes: number | null;
  visit_date:       string;
  created_at:       string;
  // Joined relations
  visitors?: Visitor & {
    programs?: Program & { colleges: College };
    colleges?: College;
  };
}

// ── Backwards-compat aliases ──────────────────────────────────────────
// These let old components that still use VisitorLog or Student compile fine
export type VisitorLog = VisitLog;
export type Student    = Visitor;

// ── Dashboard filters ─────────────────────────────────────────────────
export interface DashboardFilters {
  timeFilter:  TimeFilter;
  dateFrom:    string;
  dateTo:      string;
  purpose:     string;
  collegeId:   number | '';
  visitorType: string;
}

// ── Constants ─────────────────────────────────────────────────────────
export const PURPOSES: VisitPurpose[] = [
  'Reading', 'Research', 'Studying', 'Computer Use',
];

export const PURPOSE_EMOJI: Record<VisitPurpose, string> = {
  'Reading':      '📖',
  'Research':     '🔬',
  'Studying':     '📚',
  'Computer Use': '💻',
};

// Lowercase keys match DB values ('student', 'faculty', 'staff')
export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  student: 'Student',
  faculty: 'Faculty',
  staff:   'Staff',
};