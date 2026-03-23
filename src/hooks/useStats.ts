// src/hooks/useStats.ts
// KEY FIX: The Supabase nested select for visitors must follow the
// actual FK relationships defined in schema.sql:
//
//   visit_logs → visitors (visitor_id)
//   visitors   → colleges (college_id)     ← direct join
//   visitors   → programs (program_id)     ← direct join
//   programs   → colleges (college_id)     ← nested join for student's college
//
// The old code tried:  visitors ( programs ( colleges ( name ) ) )
// That only works if the student has BOTH program_id AND the program has college_id.
// Faculty/staff have no program_id, so college came back null → shows "—".
//
// FIX: Select BOTH visitors.college_id → colleges AND programs.college_id → colleges.
// Then in the display logic, prefer the direct college over the nested one.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase }                  from '@/lib/supabase';
import { getDateRange }              from '@/lib/utils';
import { College, Program, VisitLog, Visitor } from '@/types';
import { useVisitLogsRealtime, useVisitorsRealtime, useCurrentlyInsideRealtime } from './useRealtime';

// ── Colleges ──────────────────────────────────────────────────────────
export function useColleges() {
  return useQuery<College[]>({
    queryKey:   ['colleges'],
    queryFn:    async () => {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, name, abbreviation')
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime:  Infinity,
    gcTime:     Infinity,
    retry:      3,
  });
}

// ── All programs (preloaded) ──────────────────────────────────────────
export function useAllPrograms() {
  return useQuery<Program[]>({
    queryKey:   ['all-programs'],
    queryFn:    async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, college_id, name, abbreviation')
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime:  Infinity,
    gcTime:     Infinity,
    retry:      3,
  });
}

// ── Programs by college ───────────────────────────────────────────────
export function usePrograms(collegeId: number | null) {
  return useQuery<Program[]>({
    queryKey:   ['programs', collegeId],
    queryFn:    async () => {
      if (!collegeId) return [];
      const { data, error } = await supabase
        .from('programs')
        .select('id, college_id, name, abbreviation')
        .eq('college_id', collegeId)
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled:    !!collegeId,
    staleTime:  Infinity,
    gcTime:     Infinity,
  });
}

// ── Dashboard data ────────────────────────────────────────────────────
// CRITICAL FIX: Use time_in for date filtering, not visit_date
// This ensures ALL logs within the time range are included
export function useDashboardData(
  timeFilter: 'today' | 'week' | 'month' | 'custom',
  dateFrom?: string,
  dateTo?: string,
) {
  const today = new Date().toISOString().split('T')[0];
  let from = today, to = today;
  
  if (timeFilter === 'week') {
    const d = new Date(); 
    d.setDate(d.getDate() - d.getDay());
    from = d.toISOString().split('T')[0];
  } else if (timeFilter === 'month') {
    const d = new Date();
    from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  } else if (timeFilter === 'custom' && dateFrom && dateTo) {
    from = dateFrom; 
    to = dateTo;
  }

  const query = useQuery({
    queryKey: ['dashboard', timeFilter, dateFrom, dateTo],
    queryFn:  async () => {
      console.log('Dashboard query:', { from, to, timeFilter });
      
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          id, purpose, time_in, time_out, duration_minutes, visit_date,
          visitors (
            id, full_name, email, visitor_type, is_blocked,
            college_id,
            colleges ( id, name, abbreviation ),
            program_id,
            programs (
              id, name, abbreviation, college_id,
              colleges ( id, name, abbreviation )
            )
          )
        `)
        .gte('visit_date', from)
        .lte('visit_date', to)
        .order('time_in', { ascending: false });
        
      if (error) {
        console.error('Dashboard query error:', error);
        throw new Error(error.message);
      }
      
      console.log('Dashboard data:', data?.length, 'records');
      return data ?? [];
    },
    staleTime: 0,
    refetchInterval: 2_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });

  useVisitLogsRealtime();
  return query;
}

// ── Currently inside ──────────────────────────────────────────────────
export function useCurrentlyInside() {
  const { data, isLoading } = useQuery({
    queryKey:        ['currently-inside'],
    queryFn:         async () => {
      const { count, error } = await supabase
        .from('visit_logs')
        .select('id', { count: 'exact', head: true })
        .is('time_out', null);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime:       0, // Always fresh
    refetchInterval: 2_000, // Aggressive polling every 2s
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry:           2,
  });
  
  // Real-time subscription via centralized hook
  useCurrentlyInsideRealtime();
  
  return { count: data ?? 0, loading: isLoading };
}

// ── By college ────────────────────────────────────────────────────────
export function useByCollege(timeFilter: 'today' | 'week' | 'month' | 'custom', from?: string, to?: string) {
  const today = new Date().toISOString().split('T')[0];
  let dateFrom = today, dateTo = today;
  
  if (timeFilter === 'week') {
    const d = new Date(); 
    d.setDate(d.getDate() - d.getDay());
    dateFrom = d.toISOString().split('T')[0];
  } else if (timeFilter === 'month') {
    const d = new Date();
    dateFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  } else if (timeFilter === 'custom' && from && to) {
    dateFrom = from; 
    dateTo = to;
  }

  const query = useQuery({
    queryKey: ['by-college', timeFilter, from, to],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`
          id,
          visitors (
            college_id,
            colleges ( name, abbreviation ),
            programs ( college_id, colleges ( name, abbreviation ) )
          )
        `)
        .gte('visit_date', dateFrom)
        .lte('visit_date', dateTo);
      if (error) throw new Error(error.message);

      const counts: Record<string, number> = {};
      for (const log of data ?? []) {
        const v = (log.visitors as any);
        // Prefer direct college, fall back to program's college
        const abbr =
          v?.colleges?.abbreviation ??
          v?.programs?.colleges?.abbreviation ??
          'Other';
        counts[abbr] = (counts[abbr] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([college, count]) => ({ college, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 0, // Always fresh
    refetchInterval: 3_000, // Poll every 3s
    refetchOnWindowFocus: true,
    retry:     2,
  });
  
  // Real-time updates
  useVisitLogsRealtime();
  
  return query;
}

// ── By course ─────────────────────────────────────────────────────────
export function useByCourse(timeFilter: 'today' | 'week' | 'month' | 'custom', from?: string, to?: string) {
  const today = new Date().toISOString().split('T')[0];
  let dateFrom = today, dateTo = today;
  
  if (timeFilter === 'week') {
    const d = new Date(); 
    d.setDate(d.getDate() - d.getDay());
    dateFrom = d.toISOString().split('T')[0];
  } else if (timeFilter === 'month') {
    const d = new Date();
    dateFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  } else if (timeFilter === 'custom' && from && to) {
    dateFrom = from; 
    dateTo = to;
  }

  const query = useQuery({
    queryKey: ['by-course', timeFilter, from, to],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('visit_logs')
        .select(`id, visitors ( programs ( name, abbreviation ) )`)
        .gte('visit_date', dateFrom)
        .lte('visit_date', dateTo);
      if (error) throw new Error(error.message);

      const counts: Record<string, { count: number; fullName: string; abbreviation: string }> = {};
      for (const log of data ?? []) {
        const prog = (log.visitors as any)?.programs;
        const abbr = prog?.abbreviation ?? 'N/A';
        if (!counts[abbr]) {
          counts[abbr] = { count: 0, fullName: prog?.name ?? 'No Program', abbreviation: abbr };
        }
        counts[abbr].count += 1;
      }
      return Object.values(counts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    staleTime: 0, // Always fresh
    refetchInterval: 3_000, // Poll every 3s
    refetchOnWindowFocus: true,
    retry:     2,
  });
  
  // Real-time updates
  useVisitLogsRealtime();
  
  return query;
}

// ── Visit logs (paginated) ────────────────────────────────────────────
export function useVisitLogs(
  timeFilter: 'today' | 'week' | 'month' | 'custom',
  search: string,
  from?: string,
  to?: string,
  page = 0,
  pageSize = 25,
) {
  const query = useQuery({
    queryKey: ['visit-logs', timeFilter, search, from, to, page],
    queryFn:  async () => {
      // Search by visitor first if needed
      let visitorIds: string[] | null = null;
      if (search.trim()) {
        const { data: matches } = await supabase
          .from('visitors')
          .select('id')
          .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        visitorIds = (matches ?? []).map(v => v.id);
        if (visitorIds.length === 0) return { data: [], count: 0 };
      }

      let q = supabase
        .from('visit_logs')
        .select(`
          id, purpose, time_in, time_out, duration_minutes, visit_date,
          visitors (
            id, full_name, email, visitor_type, is_blocked,
            college_id,
            colleges ( id, name, abbreviation ),
            program_id,
            programs (
              id, name, abbreviation, college_id,
              colleges ( id, name, abbreviation )
            )
          )
        `, { count: 'exact' })
        .gte('visit_date', from || new Date().toISOString().split('T')[0])
        .lte('visit_date', to || new Date().toISOString().split('T')[0])
        .order('time_in', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (visitorIds !== null) q = q.in('visitor_id', visitorIds);

      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { data: (data ?? []) as unknown as VisitLog[], count: count ?? 0 };
    },
    staleTime: 0, // Always fresh
    refetchInterval: 2_000, // Aggressive polling every 2s
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry:     2,
  });
  
  // Real-time updates
  useVisitLogsRealtime();
  
  return query;
}

// ── Fetch all logs for CSV export ─────────────────────────────────────
export async function fetchAllLogsCSV(timeFilter: 'today' | 'week' | 'month' | 'custom', from?: string, to?: string) {
  const { data, error } = await supabase
    .from('visit_logs')
    .select(`
      id, purpose, time_in, time_out, duration_minutes, visit_date,
      visitors (
        full_name, email, visitor_type,
        colleges ( name, abbreviation ),
        programs ( name, abbreviation, colleges ( name, abbreviation ) )
      )
    `)
    .gte('visit_date', from || new Date().toISOString().split('T')[0])
    .lte('visit_date', to || new Date().toISOString().split('T')[0])
    .order('time_in', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as VisitLog[];
}

// ── Visitors (user management) ────────────────────────────────────────
export function useVisitors(search: string) {
  const query = useQuery<Visitor[]>({
    queryKey: ['visitors', search],
    queryFn:  async () => {
      let q = supabase
        .from('visitors')
        .select(`
          id, full_name, email, visitor_type,
          is_blocked, created_at, department,
          college_id,
          colleges ( id, name, abbreviation ),
          program_id,
          programs (
            id, name, abbreviation, college_id,
            colleges ( id, name, abbreviation )
          )
        `)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Visitor[];
    },
    staleTime: 0, // Always fresh
    refetchInterval: 2_000, // Aggressive polling every 2s
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry:     2,
  });
  
  // Real-time updates
  useVisitorsRealtime();
  
  return query;
}