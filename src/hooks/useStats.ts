// =====================================================================
// NEU Library Visitor Log System
// Data Hooks — All Supabase queries use normalized joins
// File: src/hooks/useStats.ts
// =====================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getDateRange } from '@/lib/utils';
import { College, Program, VisitorLog } from '@/types';

// ── Colleges — fetched from DB for registration dropdown ───────────────
export function useColleges() {
  return useQuery<College[]>({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name')
        .order('name');
      if (error) throw new Error('Failed to load colleges: ' + error.message);
      return data ?? [];
    },
    staleTime: Infinity,
  });
}

// ── Programs — fetched from DB, filtered by selected college ───────────
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
      if (error) throw new Error('Failed to load programs: ' + error.message);
      return data ?? [];
    },
    enabled: !!collegeId,
    staleTime: Infinity,
  });
}

// ── Stat cards ─────────────────────────────────────────────────────────
export function useStatCards() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['stat-cards'],
    queryFn: async () => {
      const ranges = {
        today:      getDateRange('today'),
        this_week:  getDateRange('week'),
        this_month: getDateRange('month'),
        this_year:  getDateRange('year'),
      };

      const [today, week, month, year] = await Promise.all(
        Object.values(ranges).map(({ from, to }) =>
          supabase
            .from('visitor_logs')
            .select('id', { count: 'exact', head: true })
            .gte('time_in', from)
            .lte('time_in', to)
            .then(({ count, error }) => {
              if (error) throw new Error(error.message);
              return count ?? 0;
            })
        )
      );

      return { today, this_week: week, this_month: month, this_year: year };
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('stat-cards-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['stat-cards'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

// ── Currently inside (open sessions) ──────────────────────────────────
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

  useEffect(() => {
    const channel = supabase
      .channel('inside-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        qc.invalidateQueries({ queryKey: ['currently-inside'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return { count: data ?? 0, loading: isLoading };
}

// ── Visitors by college (for pie chart) ───────────────────────────────
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
        const collegeName = (log.students as any)?.programs?.colleges?.name ?? 'Unknown';
        counts[collegeName] = (counts[collegeName] ?? 0) + 1;
      }

      return Object.entries(counts)
        .map(([college, count]) => ({ college, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000,
  });
}

// ── Visitors by program (for bar chart) ───────────────────────────────
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
        const programName = (log.students as any)?.programs?.name ?? 'Unknown';
        counts[programName] = (counts[programName] ?? 0) + 1;
      }

      return Object.entries(counts)
        .map(([course, count]) => ({ course, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    staleTime: 60_000,
  });
}

// ── Visitor logs table (paginated + searchable) ────────────────────────
export function useVisitorLogs(
  filter:   string,
  search:   string,
  from?:    string,
  to?:      string,
  page      = 0,
  pageSize  = 25,
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
             id, name, email, student_number, is_blocked,
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
      return { data: (data ?? []) as VisitorLog[], count: count ?? 0 };
    },
    staleTime: 15_000,
  });
}

// ── Fetch ALL logs for CSV export (no pagination) ─────────────────────
export async function fetchAllLogsCSV(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);

  const { data, error } = await supabase
    .from('visitor_logs')
    .select(
      `id, purpose, login_method, time_in, time_out, duration_minutes, date,
       students (
         name, email, student_number,
         programs ( name, colleges ( name ) )
       )`
    )
    .gte('time_in', range.from)
    .lte('time_in', range.to)
    .order('time_in', { ascending: false });

  if (error) throw new Error('CSV export failed: ' + error.message);
  return (data ?? []) as VisitorLog[];
}