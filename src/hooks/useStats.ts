import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getDateRange } from '@/lib/utils';
import { VisitorLog, CollegeStat, CourseStat, StatCards } from '@/types';

// ── Stat cards ────────────────────────────────────────────────────────────
async function fetchStatCards(): Promise<StatCards> {
  const counts = await Promise.all(
    ['today', 'week', 'month', 'year'].map(async (f) => {
      const { from, to } = getDateRange(f);
      const { count } = await supabase
        .from('visitor_logs')
        .select('*', { count: 'exact', head: true })
        .gte('time_in', from).lte('time_in', to);
      return count ?? 0;
    })
  );
  return { today: counts[0], this_week: counts[1], this_month: counts[2], this_year: counts[3] };
}

export function useStatCards() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['stat-cards'], queryFn: fetchStatCards, staleTime: 15_000 });
  useEffect(() => {
    const ch = supabase.channel('sc-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['stat-cards'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return q;
}

// ── Currently inside (time_out IS NULL) ──────────────────────────────────
export function useCurrentlyInside() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { count: c } = await supabase
      .from('visitor_logs')
      .select('*', { count: 'exact', head: true })
      .is('time_out', null);
    setCount(c ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase.channel('inside-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  return { count, loading };
}

// ── Visitors by college ──────────────────────────────────────────────────
async function fetchByCollege(f: string, from?: string, to?: string): Promise<CollegeStat[]> {
  const range = getDateRange(f, from, to);
  const { data } = await supabase
    .from('visitor_logs')
    .select('students(college)')
    .gte('time_in', range.from).lte('time_in', range.to);
  const m: Record<string, number> = {};
  data?.forEach((r: any) => { const c = r.students?.college; if (c) m[c] = (m[c] || 0) + 1; });
  return Object.entries(m).map(([college, count]) => ({ college, count })).sort((a, b) => b.count - a.count);
}

export function useByCollege(f: string, from?: string, to?: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['by-college', f, from, to], queryFn: () => fetchByCollege(f, from, to) });
  useEffect(() => {
    const ch = supabase.channel('college-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['by-college'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return q;
}

// ── Visitors by course ────────────────────────────────────────────────────
async function fetchByCourse(f: string, from?: string, to?: string): Promise<CourseStat[]> {
  const range = getDateRange(f, from, to);
  const { data } = await supabase
    .from('visitor_logs')
    .select('students(course)')
    .gte('time_in', range.from).lte('time_in', range.to);
  const m: Record<string, number> = {};
  data?.forEach((r: any) => { const c = r.students?.course; if (c) m[c] = (m[c] || 0) + 1; });
  return Object.entries(m).map(([course, count]) => ({ course, count })).sort((a, b) => b.count - a.count).slice(0, 10);
}

export function useByCourse(f: string, from?: string, to?: string) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['by-course', f, from, to], queryFn: () => fetchByCourse(f, from, to) });
  useEffect(() => {
    const ch = supabase.channel('course-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['by-course'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return q;
}

// ── Visitor logs table ────────────────────────────────────────────────────
interface LogsResult { data: VisitorLog[]; count: number; }

async function fetchLogs(
  f: string, search: string, from?: string, to?: string,
  page = 0, size = 25
): Promise<LogsResult> {
  const range = getDateRange(f, from, to);
  let q = supabase
    .from('visitor_logs')
    .select('*, students(*)', { count: 'exact' })
    .gte('time_in', range.from).lte('time_in', range.to)
    .order('time_in', { ascending: false })
    .range(page * size, page * size + size - 1);

  const { data, count, error } = await q;
  if (error) throw error;

  let rows = (data as VisitorLog[]) ?? [];
  if (search.trim()) {
    const s = search.toLowerCase();
    rows = rows.filter(r =>
      r.students?.name?.toLowerCase().includes(s) ||
      r.students?.email?.toLowerCase().includes(s) ||
      r.students?.college?.toLowerCase().includes(s) ||
      r.students?.course?.toLowerCase().includes(s)
    );
  }
  return { data: rows, count: count ?? 0 };
}

export function useVisitorLogs(
  f: string, search: string, from?: string, to?: string,
  page = 0, size = 25
) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['visitor-logs', f, search, from, to, page, size],
    queryFn: () => fetchLogs(f, search, from, to, page, size),
  });
  useEffect(() => {
    const ch = supabase.channel('logs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['visitor-logs'] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return q;
}

// ── All logs for CSV export ───────────────────────────────────────────────
export async function fetchAllLogsCSV(f: string, from?: string, to?: string): Promise<VisitorLog[]> {
  const range = getDateRange(f, from, to);
  const { data, error } = await supabase
    .from('visitor_logs')
    .select('*, students(*)')
    .gte('time_in', range.from).lte('time_in', range.to)
    .order('time_in', { ascending: false });
  if (error) throw error;
  return (data as VisitorLog[]) ?? [];
}
