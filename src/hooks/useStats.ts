// src/hooks/useStats.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect }                 from 'react';
import { supabase }                  from '@/lib/supabase';
import { getDateRange }              from '@/lib/utils';
import { College, Program, VisitLog, Visitor } from '@/types';

export function useColleges() {
  return useQuery<College[]>({
    queryKey: ['colleges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colleges').select('id, name, abbreviation').order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
  });
}

export function usePrograms(collegeId: number | null) {
  return useQuery<Program[]>({
    queryKey: ['programs', collegeId],
    queryFn: async () => {
      if (!collegeId) return [];
      const { data, error } = await supabase
        .from('programs').select('id, college_id, name, abbreviation')
        .eq('college_id', collegeId).order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!collegeId,
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });
}

export function useDashboardData(
  timeFilter: 'today' | 'week' | 'custom',
  dateFrom?: string, dateTo?: string,
) {
  const qc    = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  let from = today, to = today;
  if (timeFilter === 'week') {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    from = d.toISOString().split('T')[0];
  } else if (timeFilter === 'custom') {
    from = dateFrom ?? today; to = dateTo ?? today;
  }

  const query = useQuery({
    queryKey: ['dashboard', timeFilter, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          id, purpose, login_method, time_in, time_out, duration_minutes,
          visitors (
            id, email, full_name, visitor_type,
            programs ( id, name, abbreviation, college_id,
              colleges ( id, name, abbreviation )
            ),
            colleges ( id, name, abbreviation )
          )
        `)
        .gte('visit_date', from)
        .lte('visit_date', to)
        .order('time_in', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30_000, retry: 2,
  });

  useEffect(() => {
    const ch = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_logs' },
        () => {
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: ['currently-inside'] });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useCurrentlyInside() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['currently-inside'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('visit_logs').select('id', { count: 'exact', head: true }).is('time_out', null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    refetchInterval: 30_000, retry: 2,
  });
  useEffect(() => {
    const ch = supabase.channel('inside-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_logs' },
        () => qc.invalidateQueries({ queryKey: ['currently-inside'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return { count: data ?? 0, loading: isLoading };
}

export function useByCollege(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);
  return useQuery({
    queryKey: ['by-college', filter, from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from('visit_logs')
        .select('id, visitors ( programs ( colleges ( name ) ), colleges ( name ) )')
        .gte('time_in', range.from).lte('time_in', range.to);
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      for (const log of data ?? []) {
        const v    = (log.visitors as any);
        const name = v?.programs?.colleges?.name ?? v?.colleges?.name ?? 'Other';
        counts[name] = (counts[name] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([college, count]) => ({ college, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000, retry: 2,
  });
}

// FIXED: Returns abbreviation + fullName for chart display
export function useByCourse(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);
  return useQuery({
    queryKey: ['by-course', filter, from, to],
    queryFn: async () => {
      const { data, error } = await supabase.from('visit_logs')
        .select('id, visitors ( programs ( name, abbreviation ) )')
        .gte('time_in', range.from).lte('time_in', range.to);
      if (error) throw new Error(error.message);

      const counts: Record<string, { count: number; fullName: string; abbreviation: string }> = {};
      for (const log of data ?? []) {
        const prog         = (log.visitors as any)?.programs;
        const abbr         = prog?.abbreviation ?? 'N/A';
        const fullName     = prog?.name         ?? 'No Program';
        if (!counts[abbr]) counts[abbr] = { count: 0, fullName, abbreviation: abbr };
        counts[abbr].count += 1;
      }

      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    staleTime: 60_000, retry: 2,
  });
}

export function useVisitLogs(
  filter: string, search: string,
  from?: string, to?: string,
  page = 0, pageSize = 25,
) {
  const range = getDateRange(filter, from, to);
  return useQuery({
    queryKey: ['visit-logs', filter, search, from, to, page],
    queryFn: async () => {
      let visitorIds: string[] | null = null;
      if (search.trim()) {
        const { data: m } = await supabase.from('visitors').select('id')
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
        visitorIds = (m ?? []).map(v => v.id);
        if (visitorIds.length === 0) return { data: [], count: 0 };
      }
      let q = supabase.from('visit_logs')
        .select(`
          id, purpose, login_method, time_in, time_out, duration_minutes, visit_date,
          visitors (
            id, full_name, email, student_number, visitor_type, is_blocked,
            programs ( name, abbreviation, colleges ( name ) ),
            colleges ( name )
          )
        `, { count: 'exact' })
        .gte('time_in', range.from).lte('time_in', range.to)
        .order('time_in', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (visitorIds !== null) q = q.in('visitor_id', visitorIds);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: (data ?? []) as unknown as VisitLog[], count: count ?? 0 };
    },
    staleTime: 15_000, retry: 2,
  });
}

export async function fetchAllLogsCSV(filter: string, from?: string, to?: string) {
  const range = getDateRange(filter, from, to);
  const { data, error } = await supabase.from('visit_logs')
    .select(`
      id, purpose, login_method, time_in, time_out, duration_minutes, visit_date,
      visitors (
        full_name, email, student_number, visitor_type,
        programs ( name, abbreviation, colleges ( name ) ),
        colleges ( name )
      )
    `)
    .gte('time_in', range.from).lte('time_in', range.to)
    .order('time_in', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as VisitLog[];
}

export function useVisitors(search: string) {
  return useQuery<Visitor[]>({
    queryKey: ['visitors', search],
    queryFn: async () => {
      let q = supabase.from('visitors')
        .select('id, full_name, email, visitor_type, student_number, is_blocked, created_at, program_id, college_id, programs ( name, abbreviation, colleges ( name ) ), colleges ( name )')
        .order('created_at', { ascending: false });
      if (search.trim())
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Visitor[];
    },
    staleTime: 15_000, retry: 2,
  });
}