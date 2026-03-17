// =====================================================================
// NEU Library — Data Hooks
// File: src/hooks/useStats.ts
// =====================================================================
// CHANGES:
//   + useDashboardData() — fetches logs with all joins for dashboard
//   + useColleges() and usePrograms() — for filter dropdowns
//   + All queries use normalized joins (visitor_logs → students → programs → colleges)
// =====================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getDateRange } from '@/lib/utils';
import { College, Program, VisitorLog } from '@/types';

// ── Date range helper ─────────────────────────────────────────────────
function getRange(filter: 'day' | 'week' | 'custom', from?: string, to?: string) {
  const today = new Date().toISOString().split('T')[0];

  if (filter === 'day') return { from: today, to: today };

  if (filter === 'week') {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay()); // Sunday
    return {
      from: start.toISOString().split('T')[0],
      to:   today,
    };
  }

  // custom
  return {
    from: from ?? today,
    to:   to   ?? today,
  };
}

// ── Colleges ─────────────────────────────────────────────────────────
export function useColleges() {
  return useQuery<College[]>({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name')
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: Infinity,
  });
}

// ── Programs (filtered by college) ───────────────────────────────────
export function usePrograms(collegeId: number | null) {
  return useQuery<Program[]>({
    queryKey: ['programs', collegeId],
    queryFn: async () => {
      if (!collegeId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, college_id, name')
        .eq('college_id', collegeId)
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!collegeId,
    staleTime: Infinity,
  });
}

// ── Dashboard data — fetches raw logs for filters ────────────────────
// Returns all logs for the selected time period with full joins.
// Filtering (purpose/college/visitorType) is done client-side in Dashboard.tsx
export function useDashboardData(
  timeFilter: 'day' | 'week' | 'custom',
  dateFrom?: string,
  dateTo?: string,
) {
  const qc = useQueryClient();
  const range = getRange(timeFilter, dateFrom, dateTo);

  const query = useQuery({
    queryKey: ['dashboard-data', timeFilter, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select(`
          id,
          purpose,
          time_in,
          time_out,
          duration_minutes,
          students (
            id,
            name,
            email,
            visitor_type,
            programs (
              name,
              college_id,
              colleges ( id, name )
            )
          )
        `)
        .gte('date', range.from)
        .lte('date', range.to)
        .order('time_in', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000,
  });

  // Real-time: invalidate when visitor_logs changes
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_logs' },
        () => {
          qc.invalidateQueries({ queryKey: ['dashboard-data'] });
          qc.invalidateQueries({ queryKey: ['currently-inside'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

// ── Currently inside (live) ───────────────────────────────────────────
export function useCurrentlyInside() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['currently-inside'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('visitor_logs')
        .select('id', { count: 'exact', head: true })
        .is('time_out', null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return { count: data ?? 0, loading: isLoading };
}

// ── Stat cards (for existing dashboard) ──────────────────────────────
export function useStatCards() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['stat-cards'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStr = weekStart.toISOString().split('T')[0];

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split('T')[0];

      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];

      const ranges = [
        { from: today,    to: today },
        { from: weekStr,  to: today },
        { from: monthStr, to: today },
        { from: yearStart, to: today },
      ];

      const counts = await Promise.all(
        ranges.map(({ from, to }) =>
          supabase
            .from('visitor_logs')
            .select('id', { count: 'exact', head: true })
            .gte('time_in', from)
            .lte('time_in', to + 'T23:59:59')
            .then(({ count, error }) => {
              if (error) throw new Error(error.message);
              return count ?? 0;
            })
        )
      );

      return {
        today:      counts[0],
        this_week:  counts[1],
        this_month: counts[2],
        this_year:  counts[3],
      };
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('stat-cards-rt')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_logs' },
        () => qc.invalidateQueries({ queryKey: ['stat-cards'] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

// ── Visitors by college (pie chart) ──────────────────────────────────
export function useByCollege(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);

  return useQuery({
    queryKey: ['by-college', filter, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select(`id, students ( programs ( colleges ( name ) ) )`)
        .gte('time_in', range.from)
        .lte('time_in', range.to);

      if (error) throw new Error(error.message);

      const counts: Record<string, number> = {};
      for (const log of data ?? []) {
        const name = (log.students as any)?.programs?.colleges?.name ?? 'Unknown';
        counts[name] = (counts[name] ?? 0) + 1;
      }

      return Object.entries(counts)
        .map(([college, count]) => ({ college, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000,
  });
}

// ── Visitors by program (bar chart) ──────────────────────────────────
export function useByCourse(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);

  return useQuery({
    queryKey: ['by-course', filter, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select(`id, students ( programs ( name ) )`)
        .gte('time_in', range.from)
        .lte('time_in', range.to);

      if (error) throw new Error(error.message);

      const counts: Record<string, number> = {};
      for (const log of data ?? []) {
        const name = (log.students as any)?.programs?.name ?? 'Unknown';
        counts[name] = (counts[name] ?? 0) + 1;
      }

      return Object.entries(counts)
        .map(([course, count]) => ({ course, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    staleTime: 60_000,
  });
}

// ── Visitor logs table (paginated + searchable) ───────────────────────
export function useVisitorLogs(
  filter: string,
  search: string,
  from?: string,
  to?: string,
  page = 0,
  pageSize = 25,
) {
  const range = getDateRange(filter, from, to);

  return useQuery({
    queryKey: ['visitor-logs', filter, search, from, to, page, pageSize],
    queryFn: async () => {
      let studentIds: string[] | null = null;
      if (search.trim()) {
        const { data: matched } = await supabase
          .from('students')
          .select('id')
          .or(`name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
        studentIds = (matched ?? []).map((s) => s.id);
        if (studentIds.length === 0) return { data: [], count: 0 };
      }

      let query = supabase
        .from('visitor_logs')
        .select(
          `id, purpose, login_method, time_in, time_out, duration_minutes, date,
          students (
            id, name, email, student_number, is_blocked, visitor_type,
            programs ( name, colleges ( name ) )
          )`,
          { count: 'exact' }
        )
        .gte('time_in', range.from)
        .lte('time_in', range.to)
        .order('time_in', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (studentIds !== null) {
        query = query.in('student_id', studentIds);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);
      return { data: (data ?? []) as unknown as VisitorLog[], count: count ?? 0 };
    },
    staleTime: 15_000,
  });
}

// ── Fetch ALL logs for CSV export ─────────────────────────────────────
export async function fetchAllLogsCSV(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);

  const { data, error } = await supabase
    .from('visitor_logs')
    .select(`
      id, purpose, login_method, time_in, time_out, duration_minutes, date,
      students (
        name, email, student_number, visitor_type,
        programs ( name, colleges ( name ) )
      )
    `)
    .gte('time_in', range.from)
    .lte('time_in', range.to)
    .order('time_in', { ascending: false });

  if (error) throw new Error('CSV export failed: ' + error.message);
  return (data ?? []) as unknown as VisitorLog[];
}