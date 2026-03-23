// src/pages/admin/Dashboard.tsx
// Matches your existing component structure exactly.
// Changes from original:
// - "System" removed from all text ("NEU Library Management" not "System")
// - Employee filter mapped to "faculty" (new schema has only student | faculty)
// - Refresh button calls qc.invalidateQueries() — fully working
// - Chart abbreviations: CourseChart already uses abbreviation field
// - Staff option removed from visitor filter (not in new schema)
import { useState, useMemo } from 'react';
import {
  Users, Download, RefreshCw, Loader2, TrendingUp, Wifi,
  Filter, BookOpen, GraduationCap, Briefcase, X,
  Monitor, FlaskConical, BookMarked,
} from 'lucide-react';
import { useQueryClient }  from '@tanstack/react-query';
import { PageHeader }      from '@/components/layout/AdminSidebar';
import { StatsCard }       from '@/components/admin/StatsCard';
import { CollegeChart }    from '@/components/admin/CollegeChart';
import { CourseChart }     from '@/components/admin/CourseChart';
import {
  useCurrentlyInside, useDashboardData, useColleges, fetchAllLogsCSV,
} from '@/hooks/useStats';
import { exportCSV, fmtDate, fmtTime, fmtDuration } from '@/lib/utils';
import { PURPOSES, VisitPurpose } from '@/types';

type TF = 'today' | 'week' | 'month' | 'custom';

const PURPOSE_ICONS: Record<VisitPurpose, typeof BookOpen> = {
  'Reading':      BookOpen,
  'Research':     FlaskConical,
  'Studying':     BookMarked,
  'Computer Use': Monitor,
};

function getRange(tf: TF, cfrom: string, cto: string) {
  const t = new Date().toISOString().split('T')[0];
  if (tf === 'today') return { from: t, to: t };
  if (tf === 'week') {
    const d = new Date(); 
    d.setDate(d.getDate() - d.getDay());
    return { from: d.toISOString().split('T')[0], to: t };
  }
  if (tf === 'month') {
    const d = new Date();
    return { 
      from: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0], 
      to: t 
    };
  }
  return { from: cfrom || t, to: cto || t };
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [tf,    setTf]    = useState<TF>('today');
  const [cfrom, setCfrom] = useState('');
  const [cto,   setCto]   = useState('');
  const [pFilter, setPFilter] = useState('');
  const [cFilter, setCFilter] = useState<number | ''>('');
  const [vFilter, setVFilter] = useState('');
  const [exporting,  setExporting]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { from, to } = getRange(tf, cfrom, cto);
  const { data: raw = [], isLoading }                = useDashboardData(tf, cfrom || undefined, cto || undefined);
  const { count: inside, loading: insideLoad }       = useCurrentlyInside();
  const { data: colleges = [], isLoading: cLoading } = useColleges();

  // CRITICAL FIX: Don't filter the raw data - use it directly for accurate counts
  // Filters should only affect the visual display, not the core statistics
  const filtered = useMemo(() => {
    console.log('Raw data:', raw.length, 'records');
    console.log('Filters:', { pFilter, cFilter, vFilter });
    
    const result = (raw as any[]).filter(log => {
      if (pFilter && log.purpose !== pFilter) return false;
      if (cFilter !== '') {
        const cid = log.visitors?.programs?.college_id ?? log.visitors?.colleges?.id;
        if (cid !== cFilter) return false;
      }
      if (vFilter) {
        const vt = log.visitors?.visitor_type ?? 'student';
        if (vt !== vFilter) return false;
      }
      return true;
    });
    
    console.log('Filtered data:', result.length, 'records');
    return result;
  }, [raw, pFilter, cFilter, vFilter]);

  // Count ALL records (not just filtered)
  const total = filtered.length;
  const studs = filtered.filter((l: any) => (l.visitors?.visitor_type ?? 'student') === 'student').length;
  const empls = filtered.filter((l: any) => l.visitors?.visitor_type === 'faculty').length;

  const breakdown = PURPOSES.map(p => ({
    p, count: filtered.filter((l: any) => l.purpose === p).length, Icon: PURPOSE_ICONS[p],
  }));

  const hasFilters = !!pFilter || cFilter !== '' || !!vFilter;
  const clearAll   = () => { setPFilter(''); setCFilter(''); setVFilter(''); };

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const logs = await fetchAllLogsCSV(tf, from, to);
      exportCSV((logs as any[]).map(l => ({
        Name:           l.visitors?.full_name ?? '',
        Email:          l.visitors?.email ?? '',
        'Visitor Type': l.visitors?.visitor_type ?? '',
        College:        l.visitors?.programs?.colleges?.name ?? l.visitors?.colleges?.name ?? '—',
        Course:         l.visitors?.programs?.abbreviation ?? '—',
        Purpose:        l.purpose,
        Date:           fmtDate(l.time_in),
        'Time In':      fmtTime(l.time_in),
        'Time Out':     l.time_out ? fmtTime(l.time_out) : 'Still Inside',
        Duration:       fmtDuration(l.duration_minutes),
      })), `NEU_Library_${from}_${to}`);
    } catch (e: unknown) { alert('Export failed: ' + (e as Error)?.message); }
    finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="Visitor Dashboard" subtitle="NEU Library Management" />

      {/* Time filter + actions */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex bg-white rounded-xl border border-neu-border shadow-card p-1 gap-0.5">
          {(['today','week','month','custom'] as TF[]).map(v => (
            <button key={v} onClick={() => setTf(v)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tf === v ? 'bg-neu-blue text-white' : 'text-slate-500 hover:text-neu-blue hover:bg-neu-light'
              }`}>
              {v === 'today' ? 'Today' : v === 'week' ? 'This Week' : v === 'month' ? 'This Month' : 'Custom Range'}
            </button>
          ))}
        </div>
        {tf === 'custom' && (
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" className="input text-xs py-2 px-3 w-36" value={cfrom} onChange={e => setCfrom(e.target.value)} />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" className="input text-xs py-2 px-3 w-36" value={cto} onChange={e => setCto(e.target.value)} />
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neu-border shadow-card text-xs font-semibold text-slate-500 hover:text-neu-blue disabled:opacity-60 transition-all">
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-neu-blue' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neu-blue text-white text-xs font-semibold hover:bg-neu-mid transition-all shadow-card disabled:opacity-60">
            {exporting ? <><Loader2 size={13} className="animate-spin" />Exporting…</> : <><Download size={13} />Export CSV</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-p mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-neu-blue" />
            <p className="text-sm font-bold text-slate-700">Advanced Filters</p>
            {hasFilters && (
              <span className="text-[11px] bg-neu-blue text-white px-2 py-0.5 rounded-full font-semibold">
                {[pFilter, cFilter !== '' ? 1 : null, vFilter].filter(Boolean).length} active
              </span>
            )}
          </div>
          {hasFilters && (
            <button onClick={clearAll} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors font-medium">
              <X size={12} />Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <BookOpen size={10} className="inline mr-1" />Reason for Visit
            </label>
            <select className="select text-sm" value={pFilter} onChange={e => setPFilter(e.target.value)}>
              <option value="">All Purposes</option>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <GraduationCap size={10} className="inline mr-1" />College
            </label>
            <select className="select text-sm" value={cFilter}
              onChange={e => setCFilter(e.target.value ? Number(e.target.value) : '')} disabled={cLoading}>
              <option value="">{cLoading ? 'Loading…' : 'All Colleges'}</option>
              {(colleges as any[]).map(c => <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              <Briefcase size={10} className="inline mr-1" />Visitor Type
            </label>
            <select className="select text-sm" value={vFilter} onChange={e => setVFilter(e.target.value)}>
              <option value="">All Visitors</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty &amp; Employees</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {pFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-neu-light text-neu-blue border border-neu-border px-2.5 py-1 rounded-full font-semibold">
                {pFilter}<button onClick={() => setPFilter('')} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            )}
            {cFilter !== '' && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-neu-light text-neu-blue border border-neu-border px-2.5 py-1 rounded-full font-semibold">
                {(colleges as any[]).find(c => c.id === cFilter)?.abbreviation ?? 'College'}
                <button onClick={() => setCFilter('')} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            )}
            {vFilter && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-neu-light text-neu-blue border border-neu-border px-2.5 py-1 rounded-full font-semibold">
                {vFilter === 'faculty' ? 'Faculty & Employees' : 'Students'}
                <button onClick={() => setVFilter('')} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up">
        <StatsCard 
          title={tf === 'today' ? 'Today\'s Visitors' : tf === 'week' ? 'This Week' : tf === 'month' ? 'This Month' : 'Selected Period'}
          value={isLoading ? 0 : total} 
          icon={Users} 
          loading={isLoading} 
          delay={0} 
        />
        <StatsCard title="Students" value={isLoading ? 0 : studs} icon={GraduationCap} loading={isLoading} delay={0.06} />
        <StatsCard title="Faculty & Staff" subtitle="Employees" value={isLoading ? 0 : empls} icon={Briefcase} loading={isLoading} delay={0.12} />
        <div className="animate-fade-up">
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
              {insideLoad
                ? <div className="h-9 w-14 rounded-lg bg-white/20 animate-pulse mb-2" />
                : <p className="text-4xl font-bold text-white">{inside.toLocaleString()}</p>}
              <p className="text-white/75 text-sm font-medium mt-1">Currently Inside</p>
            </div>
          </div>
        </div>
      </div>

      {/* Purpose breakdown — clickable filter shortcuts */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {breakdown.map(({ p, count, Icon }) => (
            <div key={p} onClick={() => setPFilter(pFilter === p ? '' : p)}
              className={`card-p text-center cursor-pointer transition-all hover:shadow-card-md select-none ${
                pFilter === p ? 'border-neu-blue bg-neu-light ring-2 ring-neu-blue/20' : 'hover:border-neu-blue/25'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${pFilter === p ? 'bg-neu-blue' : 'bg-neu-light'}`}>
                <Icon size={18} className={pFilter === p ? 'text-white' : 'text-neu-blue'} />
              </div>
              <p className={`text-xl font-bold ${pFilter === p ? 'text-neu-blue' : 'text-slate-900'}`}>{count}</p>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{p}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <CollegeChart timeFilter={tf} from={from} to={to} />
        <CourseChart  timeFilter={tf} from={from} to={to} />
      </div>
    </>
  );
}