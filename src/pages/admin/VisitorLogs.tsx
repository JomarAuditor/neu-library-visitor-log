import { useState, useCallback } from 'react';
import {
  Search, Download, ChevronLeft, ChevronRight,
  ClipboardList, QrCode, Mail, LogIn, LogOut, Timer,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { useVisitorLogs, fetchAllLogsCSV } from '@/hooks/useStats';
import { exportCSV, fmtDate, fmtTime, fmtDuration } from '@/lib/utils';
import { VisitorLog } from '@/types';

type Filter = 'today' | 'week' | 'month' | 'year' | 'custom';
const PAGE = 25;

const PURPOSE_BADGE: Record<string, string> = {
  'Reading':      'badge-blue',
  'Research':     'badge-purple',
  'Studying':     'badge-green',
  'Computer Use': 'badge-amber',
};

export default function VisitorLogs() {
  const [filter, setFilter] = useState<Filter>('today');
  const [cfrom,  setCfrom]  = useState('');
  const [cto,    setCto]    = useState('');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(0);
  const [exporting, setExp] = useState(false);

  const { data, isLoading } = useVisitorLogs(
    filter, search,
    filter === 'custom' ? cfrom : undefined,
    filter === 'custom' ? cto   : undefined,
    page, PAGE,
  );

  const logs  = data?.data  ?? [];
  const total = data?.count ?? 0;
  const pages = Math.ceil(total / PAGE);

  const onSearch = useCallback((v: string) => { setSearch(v); setPage(0); }, []);

  const handleExport = async () => {
    setExp(true);
    try {
      const all = await fetchAllLogsCSV(filter, filter === 'custom' ? cfrom : undefined, filter === 'custom' ? cto : undefined);
      exportCSV(all.map((l: VisitorLog) => ({
        Name:           l.students?.name ?? '',
        Email:          l.students?.email ?? '',
        'Student No.':  l.students?.student_number ?? '',
        College:        l.students?.college ?? '',
        Course:         l.students?.course ?? '',
        Purpose:        l.purpose,
        'Login Method': l.login_method,
        Date:           fmtDate(l.time_in),
        'Time In':      fmtTime(l.time_in),
        'Time Out':     l.time_out ? fmtTime(l.time_out) : 'Still Inside',
        'Duration':     fmtDuration(l.duration_minutes),
      })), `NEU_Library_Logs_${filter}`);
    } finally { setExp(false); }
  };

  return (
    <AdminLayout>
      <PageHeader title="Visitor Logs" subtitle="Complete visit records with Time In & Time Out" />

      {/* Toolbar */}
      <div className="card-p mb-5 animate-fade-up">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" className="input pl-9" placeholder="Search name, email, college, course…"
              value={search} onChange={e => onSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-neu-gray rounded-xl p-1 gap-0.5 border border-neu-border">
              {(['today','week','month','year','custom'] as Filter[]).map(f => (
                <button key={f} onClick={() => { setFilter(f); setPage(0); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === f ? 'bg-neu-blue text-white' : 'text-slate-500 hover:text-neu-blue'
                  }`}>
                  {f === 'today' ? 'Today' : f === 'week' ? 'Week' : f === 'month' ? 'Month' : f === 'year' ? 'Year' : 'Custom'}
                </button>
              ))}
            </div>
            {filter === 'custom' && (
              <>
                <input type="date" className="input text-xs py-2 px-3 w-36" value={cfrom} onChange={e => setCfrom(e.target.value)} />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" className="input text-xs py-2 px-3 w-36" value={cto}   onChange={e => setCto(e.target.value)} />
              </>
            )}
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neu-blue text-white text-xs font-semibold hover:bg-neu-mid transition-all disabled:opacity-60">
              <Download size={13} />{exporting ? 'Exporting…' : 'CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card animate-fade-up delay-1 overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-neu-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-neu-blue" />
            <span className="text-sm font-bold text-slate-800">Visit Records</span>
            <span className="text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">{total.toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Showing {logs.length} of {total}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neu-gray border-b border-neu-border">
                {['Name','Email','College','Course','Purpose','Method','Date','Time In','Time Out','Duration'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-neu-border/50">
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400">
                    <ClipboardList size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-semibold text-sm">No records found</p>
                    <p className="text-xs mt-1">Try adjusting the filter or search</p>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-neu-border/40 hover:bg-neu-gray/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-semibold text-slate-800 text-xs whitespace-nowrap">{log.students?.name ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{log.students?.email ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-slate-600 max-w-[140px] block truncate">{log.students?.college ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-600">{log.students?.course ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={PURPOSE_BADGE[log.purpose] ?? 'badge-gray'}>{log.purpose}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="badge-gray gap-1">
                      {log.login_method === 'QR Code' ? <><QrCode size={10} />QR</> : <><Mail size={10} />Email</>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(log.time_in)}</td>
                  <td className="px-4 py-3.5">
                    <span className="badge-green gap-1 whitespace-nowrap">
                      <LogIn size={10} />{fmtTime(log.time_in)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {log.time_out ? (
                      <span className="badge-amber gap-1 whitespace-nowrap">
                        <LogOut size={10} />{fmtTime(log.time_out)}
                      </span>
                    ) : (
                      <span className="badge-blue gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Inside
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {log.duration_minutes != null ? (
                      <span className="badge-gray gap-1">
                        <Timer size={10} />{fmtDuration(log.duration_minutes)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-6 py-4 border-t border-neu-border flex items-center justify-between">
            <p className="text-xs text-slate-400">Page {page + 1} of {pages} · {total.toLocaleString()} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 rounded-lg border border-neu-border hover:bg-neu-light disabled:opacity-40 transition-all">
                <ChevronLeft size={14} className="text-slate-600" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                className="p-2 rounded-lg border border-neu-border hover:bg-neu-light disabled:opacity-40 transition-all">
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
