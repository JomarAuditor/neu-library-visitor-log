import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  format, startOfDay, endOfDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  differenceInMinutes,
} from 'date-fns';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// Validates @neu.edu.ph email — used for sign-in enforcement
export function validateNEUEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@neu\.edu\.ph$/.test(email.trim());
}

// Returns true only if the email domain is @neu.edu.ph
export function isNEUEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith('@neu.edu.ph');
}

export function validateStudentNumber(sn: string): boolean {
  return /^\d{2}-\d{5}-\d{3}$/.test(sn.trim());
}

export function formatStudentNumber(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 7)}-${d.slice(7)}`;
}

export function studentNumberHint(sn: string): string | null {
  if (!sn.trim()) return null;
  if (!validateStudentNumber(sn.trim())) return 'Format: YY-NNNNN-NNN (e.g. 24-13005-502)';
  return null;
}

export function encodeQR(email: string, sn: string): string {
  return `${email.toLowerCase().trim()}|${sn.trim()}`;
}
export function decodeQR(raw: string): { email: string; studentNumber: string } | null {
  const parts = raw.split('|');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { email: parts[0].trim(), studentNumber: parts[1].trim() };
}

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

export function fmtDate(iso: string)     { try { return format(new Date(iso), 'MMM dd, yyyy');          } catch { return '—'; } }
export function fmtTime(iso: string)     { try { return format(new Date(iso), 'hh:mm a');               } catch { return '—'; } }
export function fmtDateTime(iso: string) { try { return format(new Date(iso), 'MMM dd, yyyy hh:mm a'); } catch { return '—'; } }

export function fmtDuration(minutes: number | null): string {
  if (minutes == null || minutes < 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function calcDurationMinutes(timeIn: string, timeOut: string): number {
  try { return Math.max(0, differenceInMinutes(new Date(timeOut), new Date(timeIn))); }
  catch { return 0; }
}

export function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) { alert('No data to export.'); return; }
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const v = String(row[h] ?? '').replace(/"/g, '""');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v}"` : v;
    }).join(',')),
  ];
  const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const CHART_COLORS = [
  '#003087','#0046BD','#C8A951','#1E8A2E','#D94F04',
  '#7B2D8B','#C72B2B','#4A90D9','#E67E22','#2C3E50',
];