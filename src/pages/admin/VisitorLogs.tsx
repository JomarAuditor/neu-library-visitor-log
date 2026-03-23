// src/pages/admin/VisitorLogs.tsx
// Clean layout: search bar + Filters button + Export CSV on one row.
// No field chips. Filters panel expands below on demand.
// Case-insensitive search across all fields.
import { useState, useMemo, useCallback } from 'react';
import {
  Download, ChevronLeft, ChevronRight,
  Loader2, ClipboardList, SlidersHorizontal, X,
} from 'lucide-react';
import { useVisitLogs, fetchAllLogsCSV } from '@/hooks/useStats';
import {
  exportCSV, fmtDate, fmtTime, fmtDuration,
  getCollegeAbbr, getCourseAbbr,
} from '@/lib/utils';
import { sanitizeHTML } from '@/lib/security';
import { useSearch, buildLogSearchFields } from '@/hooks/useSearch';
import { SearchBar } from '@/components/admin/SearchBar';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { PURPOSES }   from '@/types';

const PAGE_SIZE = 50;

type TF = 'today' | 'week' | 'month' | 'custom';

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

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const map: Record<string, string> = {
    green:  'bg-green-100 text-green-700',
    amber:  'bg-amber-100 text-amber-700',
    slate:  'bg-slate-100 text-slate-500',
    blue:   'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${map[color] ?? map.slate}`}>
      {children}
    </span>
  );
}

function Highlight({ text, query, className }: { text: string; query: string; className?: string }) {
  if (!query.trim() || !text) return <span className={className}>{sanitizeHTML(text || '—')}</span>;
  const safeText = sanitizeHTML(text);
  const safeQuery = sanitizeHTML(query.toLowerCase().trim());
  const idx = safeText.toLowerCase().indexOf(safeQuery);
  if (idx === -1) return <span className={className}>{safeText}</span>;
  return (
    <span className={className}>
      {safeText.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic font-black">
        {safeText.slice(idx, idx + safeQuery.length)}
      </mark>
      {safeText.slice(idx + safeQuery.length)}
    </span>
  );
}

export default function VisitorLogs() {
  const [tf,            setTf]            = useState<TF>('today');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [page,          setPage]          = useState(1);
  const [exporting,     setExporting]     = useState(false);
  const [showFilters,   setShowFilters]   = useState(false);
  const [filterType,    setFilterType]    = useState('');
  const [filterPurpose, setFilterPurpose] = useState('');

  const { from, to } = getRange(tf, dateFrom, dateTo);

  const { data, isLoading } = useVisitLogs(
    tf, '',
    from, to,
    page - 1, PAGE_SIZE,
  );

  const rawLogs    = (data?.data ?? []) as any[];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Global case-insensitive search
  const {
    searchValue, setSearch, filtered,
    resultCount, totalCount: localTotal,
    isFiltering, clearSearch,
  } = useSearch(rawLogs, buildLogSearchFields);

  // Dropdown filters applied on top of search
  const finalLogs = useMemo(() => filtered.filter(log => {
    const v = log.visitors ?? {};
    if (filterType    && (v.visitor_type ?? '') !== filterType)                            return false;
    if (filterPurpose && (log.purpose ?? '').toLowerCase() !== filterPurpose.toLowerCase()) return false;
    return true;
  }), [filtered, filterType, filterPurpose]);

  const hasDropFilter = !!(filterType || filterPurpose);

  const clearAll = useCallback(() => {
    clearSearch();
    setFilterType(''); setFilterPurpose('');
    setTf('today'); setDateFrom(''); setDateTo('');
    setPage(1);
  }, [clearSearch]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await fetchAllLogsCSV(tf, from, to);
      exportCSV((all as any[]).map(l => ({
        Name:       l.visitors?.full_name ?? '',
        Email:      l.visitors?.email ?? '',
        Type:       l.visitors?.visitor_type ?? '',
        College:    getCollegeAbbr(l.visitors),
        Course:     getCourseAbbr(l.visitors),
        Purpose:    l.purpose,
        Date:       fmtDate(l.time_in),
        'Time In':  fmtTime(l.time_in),
        'Time Out': l.time_out ? fmtTime(l.time_out) : 'Inside',
        Duration:   fmtDuration(l.duration_minutes),
        Status:     l.time_out ? 'Completed' : 'Inside',
      })), 'NEU_Library_Logs');
    } catch (e: unknown) { alert('Export failed: ' + (e as Error)?.message); }
    finally { setExporting(false); }
  };

  return (
    <>
      <PageHeader title="Visitor Logs" subtitle="NEU Library" />

      {/* Time filter buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-white rounded-xl border border-neu-border shadow-sm p-1 gap-0.5">
          {(['today','week','month','custom'] as TF[]).map(v => (
            <button key={v} onClick={() => { setTf(v); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                tf === v ? 'bg-neu-blue text-white' : 'text-slate-500 hover:text-neu-blue hover:bg-neu-light'
              }`}>
              {v === 'today' ? 'Today' : v === 'week' ? 'This Week' : v === 'month' ? 'This Month' : 'Custom Range'}
            </button>
          ))}
        </div>
        {tf === 'custom' && (
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" className="input text-xs py-2 px-3 w-36" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            <span className="text-slate-400 text-xs">to</span>
            <input type="date" className="input text-xs py-2 px-3 w-36" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>
        )}
      </div>

      {/* ── Single toolbar row ── */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search — takes up available space */}
        <div className="flex-1 max-w-xl">
          <SearchBar
            value={searchValue}
            onChange={v => { setSearch(v); setPage(1); }}
            onClear={clearSearch}
            placeholder="Search by name, email, college, course, purpose, status"
            resultCount={resultCount}
            totalCount={localTotal}
            isFiltering={isFiltering}
          />
        </div>

        {/* Filters button */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`relative flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold border transition-all shadow-sm whitespace-nowrap ${
            showFilters || hasDropFilter
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasDropFilter && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
              {[filterType, filterPurpose].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* Clear all — only shows when something is active */}
        {(isFiltering || hasDropFilter) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-3 rounded-xl text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all whitespace-nowrap"
          >
            <X size={14} /> Clear
          </button>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all disabled:opacity-60 shadow-sm whitespace-nowrap"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* ── Expandable filter panel ── */}
      {showFilters && (
        <div className="grid grid-cols-2 gap-3 mb-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
              Type
            </label>
            <select
              className="input text-sm py-2"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
              Purpose
            </label>
            <select
              className="input text-sm py-2"
              value={filterPurpose}
              onChange={e => setFilterPurpose(e.target.value)}
            >
              <option value="">All Purposes</option>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <ClipboardList size={15} className="text-slate-400" />
            <span className="font-black text-slate-700 text-sm">All Visit Records</span>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {isFiltering || hasDropFilter
                ? `${finalLogs.length} of ${totalCount}`
                : totalCount.toLocaleString()}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-blue-400" />
          </div>
        ) : finalLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ClipboardList size={34} className="text-slate-200 mb-3" />
            <p className="text-sm font-semibold text-slate-400">No records found</p>
            {(isFiltering || hasDropFilter) && (
              <button onClick={clearAll} className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-semibold">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Visitor','Type','College','Course','Purpose','Date','Time In','Time Out','Duration','Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {finalLogs.map((log: any) => {
                  const v       = log.visitors ?? {};
                  const college = getCollegeAbbr(v);
                  const course  = getCourseAbbr(v);
                  return (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[11px] font-black shrink-0">
                            {sanitizeHTML((v.full_name ?? '?')[0]).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Highlight
                              text={v.full_name ?? '—'}
                              query={searchValue}
                              className="text-xs font-bold text-slate-700 block truncate max-w-[120px]"
                            />
                            <Highlight
                              text={v.email ?? ''}
                              query={searchValue}
                              className="text-[10px] text-slate-400 block truncate max-w-[140px]"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={v.visitor_type === 'student' ? 'blue' : 'violet'}>
                          {v.visitor_type === 'faculty' ? 'Faculty' : 'Student'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={college} query={searchValue} className="text-xs font-bold text-slate-700 whitespace-nowrap" />
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={course} query={searchValue} className="text-xs font-bold text-slate-600 whitespace-nowrap" />
                      </td>
                      <td className="px-4 py-3">
                        <Highlight text={log.purpose ?? ''} query={searchValue} className="text-xs text-slate-600 font-medium whitespace-nowrap" />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {fmtDate(log.time_in)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color="green">{fmtTime(log.time_in)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {log.time_out
                          ? <Badge color="amber">{fmtTime(log.time_out)}</Badge>
                          : <span className="text-slate-300 text-[11px]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {fmtDuration(log.duration_minutes)}
                      </td>
                      <td className="px-4 py-3">
                        {log.time_out ? (
                          <Badge color="slate">Completed</Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Inside
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination — hidden when actively filtering (search shows all matches) */}
        {totalPages > 1 && !isFiltering && !hasDropFilter && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400 font-medium">
              Page {page} of {totalPages} · {totalCount.toLocaleString()} total records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={15} className="text-slate-500" />
              </button>
              <span className="text-xs font-bold text-slate-600 min-w-[50px] text-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 disabled:opacity-40 transition-all"
              >
                <ChevronRight size={15} className="text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}