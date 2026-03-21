// src/hooks/useSearch.ts
// ─────────────────────────────────────────────────────────────────────
// Reusable, case-insensitive, multi-field search hook.
// Used by both VisitorLogs and UserManagement.
//
// Design decisions:
//   1. All comparisons normalise to lowercase on BOTH sides
//      → "BSIT" === "bsit" === "Bsit" always
//   2. Single search string matches ANY field (OR logic)
//   3. Uses a debounce (120ms) so typing doesn't lag on large lists
//   4. The match function is pure so it can be unit-tested easily
// ─────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react';
import { getCollegeAbbr, getCourseAbbr, fmtDate } from '@/lib/utils';

// ── helpers ───────────────────────────────────────────────────────────
const lc = (v: unknown): string => String(v ?? '').toLowerCase().trim();

/** Returns true if any field contains the query (case-insensitive). */
export function matchesSearch(row: Record<string, unknown>, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  return Object.values(row).some(v => lc(v).includes(q));
}

// ── Log record search fields ──────────────────────────────────────────
export function buildLogSearchFields(log: any): Record<string, unknown> {
  const v = log.visitors ?? {};
  return {
    name:      v.full_name   ?? '',
    email:     v.email       ?? '',
    type:      v.visitor_type === 'student' ? 'student' : 'faculty',
    // also match the display label
    typeLabel: v.visitor_type === 'student' ? 'student' : 'faculty',
    college:   getCollegeAbbr(v),
    course:    getCourseAbbr(v),
    purpose:   log.purpose   ?? '',
    date:      fmtDate(log.time_in),         // "Mar 21, 2026"
    isoDate:   (log.time_in ?? '').slice(0, 10), // "2026-03-21"
    status:    log.time_out ? 'completed' : 'inside',
  };
}

// ── Visitor record search fields ──────────────────────────────────────
export function buildVisitorSearchFields(v: any): Record<string, unknown> {
  return {
    name:       v.full_name    ?? '',
    email:      v.email        ?? '',
    type:       v.visitor_type === 'student' ? 'student' : 'faculty',
    typeLabel:  v.visitor_type === 'student' ? 'student' : 'faculty',
    college:    getCollegeAbbr(v),
    course:     getCourseAbbr(v),
    department: v.department   ?? '',
    registered: fmtDate(v.created_at),
    isoDate:    (v.created_at ?? '').slice(0, 10),
    status:     v.is_blocked ? 'blocked' : 'active',
  };
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useSearch<T>(
  items: T[],
  buildFields: (item: T) => Record<string, unknown>,
  debounceMs = 120,
) {
  const [raw,     setRaw]     = useState('');   // what the user is typing
  const [query,   setQuery]   = useState('');   // debounced value used for filtering
  const timerRef              = useRef<ReturnType<typeof setTimeout>>();

  // Update the debounced query
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(raw), debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [raw, debounceMs]);

  // Filter — runs only when query or items change
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(item => {
      const fields = buildFields(item);
      return Object.values(fields).some(v => lc(v).includes(q));
    });
  }, [items, query, buildFields]);

  return {
    searchValue:  raw,
    setSearch:    setRaw,
    filtered,
    resultCount:  filtered.length,
    totalCount:   items.length,
    isFiltering:  !!query.trim(),
    clearSearch:  () => { setRaw(''); setQuery(''); },
  };
}