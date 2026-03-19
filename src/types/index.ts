// =====================================================================
// NEU Library — Types v4
// src/types/index.ts
// =====================================================================

export type VisitPurpose = 'Reading' | 'Research' | 'Studying' | 'Computer Use';
export type VisitorType  = 'student' | 'faculty';
export type AdminRole    = 'admin'   | 'staff';
export type TimeFilter   = 'today'   | 'week'   | 'month' | 'custom';

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

export interface Profile {
  id:         string;
  email:      string;
  full_name:  string;
  role:       AdminRole;
  created_at: string;
}

export interface Visitor {
  id:           string;
  email:        string;
  full_name:    string;
  visitor_type: VisitorType;
  college_id:   number | null;
  program_id:   number | null;
  department:   string | null;
  is_blocked:   boolean;
  created_at:   string;
  updated_at:   string;
  programs?:    Program & { colleges?: College };
  colleges?:    College;
}

export interface VisitLog {
  id:               string;
  visitor_id:       string;
  purpose:          VisitPurpose;
  time_in:          string;
  time_out:         string | null;
  duration_minutes: number | null;
  visit_date:       string;
  created_at:       string;
  visitors?: Visitor & {
    programs?: Program & { colleges?: College };
    colleges?: College;
  };
}

// Backwards compat
export type VisitorLog = VisitLog;
export type Student    = Visitor;

export const PURPOSES: VisitPurpose[] = [
  'Reading', 'Research', 'Studying', 'Computer Use',
];

export const PURPOSE_EMOJI: Record<VisitPurpose, string> = {
  'Reading':      '📖',
  'Research':     '🔬',
  'Studying':     '📚',
  'Computer Use': '💻',
};

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  student: 'Student',
  faculty: 'Faculty',
};