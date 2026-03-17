// =====================================================================
// NEU Library — Admin Dashboard
// File: src/pages/admin/Dashboard.tsx
// =====================================================================
// PROFESSOR'S REQUIREMENTS:
//   ✅ View stats by Day, Week, or Custom Date Range — shown in CARDS
//   ✅ Filter by reason for visiting (purpose)
//   ✅ Filter by college
//   ✅ Filter by employee type (Student / Faculty / Staff)
// =====================================================================

import { useState, useMemo } from 'react';
import {
  Users, Download, RefreshCw, Loader2,
  TrendingUp, Wifi, Filter, BookOpen,
  GraduationCap, Briefcase, CalendarDays, X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { StatsCard } from '@/components/admin/StatsCard';
import { CollegeChart } from '@/components/admin/CollegeChart';
import { CourseChart }  from '@/components/admin/CourseChart';
import { useCurrentlyInside, useDashboardData, useColleges, fetchAllLogsCSV } from '@/hooks/useStats';
import { exportCSV, fmtDate, fmtTime, fmtDuration } from '@/lib/utils';
import { PURPOSES } from '@/types';

type TimeFilter = 'day' | 'week' | 'custom';

function getDateRange(filter: TimeFilter, cfrom: string, cto: string) {
  const today = new Date().toISOString().split('T')[0];
  if (filter === 'day') return { from: today, to: today };
  if (filter === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return { from: d.toISOString().split('T')[0], to: today };
  }
  return { from: cfrom || today, to: cto || today };
}

export default function Dashboard() {
  const qc = useQueryClient();

  // ── Time filter ───────────────────────────────────────────────────
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day');
  const [cfrom,      setCfrom]      = useState('');
  const [cto,        setCto]        = useState('');

  // ── Stats filters ─────────────────────────────────────────────────
  const [purposeFilter,     setPurposeFilter]     = useState('');
  const [collegeFilter,     setCollegeFilter]     = useState<number | ''>('');
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('');

  const [exporting,  setExporting]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { from, to } = getDateRange(timeFilter, cfrom, cto);

  // ── Data ──────────────────────────────────────────────────────────
  const { data: rawLogs = [], isLoading: statsLoading } = useDashboardData(timeFilter, cfrom || undefined, cto || undefined);
  const { count: inside, loading: insideLoading } = useCurrentlyInside();
  const { data: colleges = [] } = useColleges();

  // ── Apply client-side filters ─────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return (rawLogs as any[]).filter(log => {
      // Filter by purpose
      if (purposeFilter && log.purpose !== purposeFilter) return false;

      // Filter by college (through join)
      if (collegeFilter !== '') {
        const cid = log.students?.programs?.college_id;
        if (cid !== collegeFilter) return false;
      }

      // Filter by visitor type
      if (visitorTypeFilter) {
        const vt = log.students?.visitor_type ?? 'Student';
        if (vt !== visitorTypeFilter) return false;
      }

      return true;
    });
  }, [rawLogs, purposeFilter, collegeFilter, visitorTypeFilter]);

  // ── Computed stats ────────────────────────────────────────────────
  const totalVisits    = filteredLogs.length;
  const uniqueVisitors = new Set(filteredLogs.map((l: any) => l.students?.id).filter(Boolean)).size;
  const studentVisits  = filteredLogs.filter((l: any) => (l.students?.visitor_type ?? 'Student') === 'Student').length;
  const employeeVisits = filteredLogs.filter((l: any) => ['Faculty', 'Staff'].includes(l.students?.visitor_type ?? '')).length;

  // Purpose breakdown for mini cards
  const purposeBreakdown = PURPOSES.map(p => ({
    purpose: p,
    count:   filteredLogs.filter((l: any) => l.purpose === p).length,
    emoji:   p === 'Reading' ? '📖' : p === 'Research' ? '🔬' : p === 'Studying' ? '📚' : '💻',
  }));

  const hasFilters = !!purposeFilter || collegeFilter !== '' || !!visitorTypeFilter;

  const clearFilters = () => {
    setPurposeFilter('');
    setCollegeFilter('');
    setVisitorTypeFilter('');
  };

  // ── Refresh ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  // ── Export ────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const filter = timeFilter === 'custom' ? 'custom' : timeFilter === 'day' ? 'today' : 'week';
      const logs = await fetchAllLogsCSV(filter, from, to);
      exportCSV(
        logs.map((l: any) => ({
          Name:            l.students?.name                     ?? '',
          Email:           l.students?.email                    ?? '',
          'ID Number':     l.students?.student_number           ?? '',
          'Visitor Type':  l.students?.visitor_type             ?? 'Student',
          College:         l.students?.programs?.colleges?.name ?? '',
          Program:         l.students?.programs?.name           ?? '',
          Purpose:         l.purpose,
          'Login Method':  l.login_method,
          Date:            fmtDate(l.time_in),
          'Time In':       fmtTime(l.time_in),
          'Time Out':      l.time_out ? fmtTime(l.time_out) : 'Still Inside',
          Duration:        fmtDuration(l.duration_minutes),
        })),
        `NEU_Library_Stats_${from}_to_${to}`
      );
    } catch (err: any) {
      alert('Export failed: ' + (err?.message ?? 'Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title="Visitor Dashboard"
        subtitle="NEU Library Management System"
      />

      {/* ── TIME FILTER BAR ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5 animate-fade-up">
        <div className="flex bg-white rounded-xl border border-neu-border shadow-sm p-1 gap-0.5">
          {([
            ['day',    '📅 Today'],
            ['week',   '📆 This Week'],
            ['custom', '📋 Custom Range'],
          ] as const).map(([v, label]) => (
            <button key={v} onClick={() => setTimeFilter(v)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                timeFilter === v ? 'bg-neu-blue text-white' : 'text-slate-500 hover:text-neu-blue hover:bg-neu-light'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {timeFilter === 'custom' && (
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" className="input text-xs py-2 px-3 w-36"
              value={cfrom} onChange={e => setCfrom(e.target.value)} />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" className="input text-xs py-2 px-3 w-36"
              value={cto} onChange={e => setCto(e.target.value)} />
          </div>
        )}

        <div className="ml-auto flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neu-border shadow-sm text-xs font-semibold text-slate-500 hover:text-neu-blue disabled:opacity-60 transition-all">
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-neu-blue' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neu-blue text-white text-xs font-semibold hover:bg-neu-mid transition-all shadow-sm disabled:opacity-60">
            {exporting ? <><Loader2 size={13} className="animate-spin" />Exporting…</> : <><Download size={13} />Export CSV</>}
          </button>
        </div>
      </div>

      {/* ── FILTER ROW — 3 dropdowns ── */}
      <div className="card-p mb-5 animate-fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-neu-blue" />
            <p className="text-sm font-bold text-slate-700">Filter Statistics</p>
            {hasFilters && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-neu-blue text-white px-2 py-0.5 rounded-full font-semibold">
                {[purposeFilter, collegeFilter !== '' ? 1 : null, visitorTypeFilter].filter(Boolean).length} active
              </span>
            )}
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium">
              <X size={12} />Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Filter 1: Reason for visiting */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <BookOpen size={10} className="inline mr-1" />Reason for Visit
            </label>
            <select
              className="select text-sm"
              value={purposeFilter}
              onChange={e => setPurposeFilter(e.target.value)}
            >
              <option value="">All Purposes</option>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Filter 2: College */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <GraduationCap size={10} className="inline mr-1" />College
            </label>
            <select
              className="select text-sm"
              value={collegeFilter}
              onChange={e => setCollegeFilter(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All Colleges</option>
              {colleges.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filter 3: Visitor Type (Student / Faculty / Staff) */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <Briefcase size={10} className="inline mr-1" />Visitor Type (Employee)
            </label>
            <select
              className="select text-sm"
              value={visitorTypeFilter}
              onChange={e => setVisitorTypeFilter(e.target.value)}
            >
              <option value="">All Visitors</option>
              <option value="Student">Students Only</option>
              <option value="Faculty">Faculty / Teachers</option>
              <option value="Staff">Staff / Employees</option>
            </select>
          </div>
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {purposeFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                Purpose: {purposeFilter}
                <button onClick={() => setPurposeFilter('')} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            )}
            {collegeFilter !== '' && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                {colleges.find((c: any) => c.id === collegeFilter)?.name?.replace('College of ', '') ?? 'College'}
                <button onClick={() => setCollegeFilter('')} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            )}
            {visitorTypeFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-semibold">
                {visitorTypeFilter}
                <button onClick={() => setVisitorTypeFilter('')} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-fade-up">

        {/* Total Visits */}
        <StatsCard
          title={timeFilter === 'day' ? "Today's Visits" : timeFilter === 'week' ? 'This Week' : 'Custom Range'}
          value={statsLoading ? 0 : totalVisits}
          icon={Users}
          loading={statsLoading}
          delay={0.00}
        />

        {/* Unique Visitors */}
        <StatsCard
          title="Unique Visitors"
          value={statsLoading ? 0 : uniqueVisitors}
          icon={CalendarDays}
          loading={statsLoading}
          delay={0.06}
        />

        {/* Student Visits */}
        <StatsCard
          title="Students"
          value={statsLoading ? 0 : studentVisits}
          icon={GraduationCap}
          loading={statsLoading}
          delay={0.12}
        />

        {/* Employee Visits */}
        <StatsCard
          title="Employees"
          subtitle="Faculty & Staff"
          value={statsLoading ? 0 : employeeVisits}
          icon={Briefcase}
          loading={statsLoading}
          delay={0.18}
        />

        {/* Currently Inside — live */}
        <div className="col-span-2 lg:col-span-1 animate-fade-up">
          <div className="card-p bg-gradient-to-br from-neu-blue to-neu-mid border-0 relative overflow-hidden h-full min-h-[130px]">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.07]">
              <Wifi size={90} strokeWidth={1} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp size={15} className="text-white" />
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Live</span>
                </span>
              </div>
              {insideLoading
                ? <div className="h-9 w-14 rounded-lg bg-white/20 animate-pulse mb-2" />
                : <p className="text-4xl font-bold text-white">{inside.toLocaleString()}</p>}
              <p className="text-white/75 text-sm font-medium mt-1">Currently Inside</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PURPOSE BREAKDOWN ── */}
      {!statsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-up">
          {purposeBreakdown.map(({ purpose, count, emoji }) => (
            <div
              key={purpose}
              onClick={() => setPurposeFilter(purposeFilter === purpose ? '' : purpose)}
              className={`card-p text-center cursor-pointer transition-all hover:shadow-card-md ${
                purposeFilter === purpose
                  ? 'border-neu-blue bg-neu-light ring-2 ring-neu-blue/20'
                  : 'hover:border-neu-blue/25'
              }`}
            >
              <p className="text-2xl mb-1">{emoji}</p>
              <p className="text-xl font-bold text-slate-900">{count}</p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{purpose}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <CollegeChart filter={timeFilter === 'custom' ? 'custom' : timeFilter === 'day' ? 'today' : 'week'} from={from} to={to} />
        <CourseChart  filter={timeFilter === 'custom' ? 'custom' : timeFilter === 'day' ? 'today' : 'week'} from={from} to={to} />
      </div>
    </AdminLayout>
  );
}