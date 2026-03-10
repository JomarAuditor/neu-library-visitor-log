import { useState } from 'react';
import { Users, Calendar, CalendarDays, CalendarRange, Download, RefreshCw, Wifi, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { StatsCard } from '@/components/admin/StatsCard';
import { CollegeChart } from '@/components/admin/CollegeChart';
import { CourseChart } from '@/components/admin/CourseChart';
import { useStatCards, useCurrentlyInside, fetchAllLogsCSV } from '@/hooks/useStats';
import { exportCSV, fmtDate, fmtTime, fmtDuration } from '@/lib/utils';
import { VisitorLog } from '@/types';

type Filter = 'today' | 'week' | 'month' | 'year' | 'custom';
const FILTERS: { v: Filter; l: string }[] = [
  { v: 'today', l: 'Today' }, { v: 'week', l: 'This Week' },
  { v: 'month', l: 'This Month' }, { v: 'year', l: 'This Year' },
  { v: 'custom', l: 'Custom' },
];

export default function Dashboard() {
  const [filter,  setFilter]  = useState<Filter>('month');
  const [cfrom,   setCfrom]   = useState('');
  const [cto,     setCto]     = useState('');
  const [exporting, setExp]   = useState(false);

  const { data: stats, isLoading: sl, refetch } = useStatCards();
  const { count: inside, loading: il } = useCurrentlyInside();

  const handleExport = async () => {
    setExp(true);
    try {
      const rows = await fetchAllLogsCSV(filter, filter === 'custom' ? cfrom : undefined, filter === 'custom' ? cto : undefined);
      exportCSV(rows.map((l: VisitorLog) => ({
        Name:            l.students?.name ?? '',
        Email:           l.students?.email ?? '',
        'Student No.':   l.students?.student_number ?? '',
        College:         l.students?.college ?? '',
        Course:          l.students?.course ?? '',
        Purpose:         l.purpose,
        'Login Method':  l.login_method,
        Date:            fmtDate(l.time_in),
        'Time In':       fmtTime(l.time_in),
        'Time Out':      l.time_out ? fmtTime(l.time_out) : 'Still Inside',
        'Duration':      fmtDuration(l.duration_minutes),
      })), `NEU_Library_Report_${filter}`);
    } finally { setExp(false); }
  };

  return (
    <AdminLayout>
      <PageHeader title="Library Visitor Dashboard" />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-white rounded-xl border border-neu-border shadow-card p-1 gap-0.5 flex-wrap">
          {FILTERS.map(({ v, l }) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === v ? 'bg-neu-blue text-white' : 'text-slate-500 hover:text-neu-blue hover:bg-neu-light'
              }`}>{l}</button>
          ))}
        </div>
        {filter === 'custom' && (
          <div className="flex gap-2 items-center">
            <input type="date" className="input text-xs py-2 px-3 w-36" value={cfrom} onChange={e => setCfrom(e.target.value)} />
            <span className="text-slate-400 text-xs font-medium">–</span>
            <input type="date" className="input text-xs py-2 px-3 w-36" value={cto}   onChange={e => setCto(e.target.value)} />
          </div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-neu-border shadow-card text-xs font-semibold text-slate-500 hover:text-neu-blue transition-all">
            <RefreshCw size={13} />Refresh
          </button>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neu-blue text-white text-xs font-semibold hover:bg-neu-mid transition-all shadow-card disabled:opacity-60">
            <Download size={13} />{exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatsCard title="Visitors Today"      value={stats?.today      ?? 0} icon={Users}        loading={sl} delay={0.00} />
        <StatsCard title="Visitors This Week"  value={stats?.this_week  ?? 0} icon={Calendar}     loading={sl} delay={0.06} />
        <StatsCard title="Visitors This Month" value={stats?.this_month ?? 0} icon={CalendarDays}  loading={sl} delay={0.12} />
        <StatsCard title="Visitors This Year"  value={stats?.this_year  ?? 0} icon={CalendarRange} loading={sl} delay={0.18} />

        {/* Currently Inside — live card */}
        <div className="sm:col-span-2 lg:col-span-1 animate-fade-up delay-4">
          <div className="card-p bg-gradient-to-br from-neu-blue to-neu-mid border-0 relative overflow-hidden h-full">
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
              {il
                ? <div className="h-9 w-14 rounded-lg bg-white/20 animate-pulse mb-2" />
                : <p className="text-4xl font-bold text-white">{inside.toLocaleString()}</p>}
              <p className="text-white/75 text-sm font-medium">Currently Inside</p>
              <p className="text-white/45 text-[10px] mt-0.5">Students with open sessions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <CollegeChart filter={filter} from={filter === 'custom' ? cfrom : undefined} to={filter === 'custom' ? cto : undefined} />
        <CourseChart  filter={filter} from={filter === 'custom' ? cfrom : undefined} to={filter === 'custom' ? cto : undefined} />
      </div>
    </AdminLayout>
  );
}
