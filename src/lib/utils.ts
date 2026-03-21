// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format, startOfDay, endOfDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  differenceInMinutes,
} from 'date-fns';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const isNEUEmail = (email: string | null | undefined): boolean =>
  !!(email ?? '').toLowerCase().trim().endsWith('@neu.edu.ph');

export function getDateRange(filter: string, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case 'week':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        to:   endOfWeek(now,   { weekStartsOn: 1 }).toISOString(),
      };
    case 'month':
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    case 'custom':
      return {
        from: customFrom ? startOfDay(new Date(customFrom)).toISOString() : startOfMonth(now).toISOString(),
        to:   customTo   ? endOfDay(new Date(customTo)).toISOString()     : endOfDay(now).toISOString(),
      };
    default:
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
}

export const fmtDate     = (iso: string) => { try { return format(new Date(iso), 'MMM dd, yyyy');         } catch { return '—'; } };
export const fmtTime     = (iso: string) => { try { return format(new Date(iso), 'hh:mm a');              } catch { return '—'; } };
export const fmtDateTime = (iso: string) => { try { return format(new Date(iso), 'MMM dd, yyyy hh:mm a'); } catch { return '—'; } };

export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function calcDurationMinutes(timeIn: string, timeOut: string): number {
  try { return Math.max(0, differenceInMinutes(new Date(timeOut), new Date(timeIn))); }
  catch { return 0; }
}

// ── College resolver ─────────────────────────────────────────────────
// Handles both direct college (faculty/staff) and nested via program (students).
// Returns abbreviation only for compact table display.
export function getCollegeAbbr(visitor: any): string {
  if (!visitor) return '—';
  // Direct college_id join (works for all visitor types)
  if (visitor.colleges?.abbreviation) return visitor.colleges.abbreviation;
  // Nested through program (student fallback)
  if (visitor.programs?.colleges?.abbreviation) return visitor.programs.colleges.abbreviation;
  return '—';
}

export function getCourseAbbr(visitor: any): string {
  if (!visitor) return '—';
  if (visitor.programs?.abbreviation) return visitor.programs.abbreviation;
  // Faculty: show department if available
  if (visitor.department) return visitor.department.slice(0, 20);
  return '—';
}

export function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) { alert('No data to export.'); return; }
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const v = String(row[h] ?? '').replace(/"/g, '""');
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
      }).join(',')
    ),
  ];
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const CHART_COLORS = [
  '#003087','#0046BD','#C8A951','#1E8A2E','#D94F04',
  '#7B2D8B','#C72B2B','#4A90D9','#E67E22','#2C3E50',
];