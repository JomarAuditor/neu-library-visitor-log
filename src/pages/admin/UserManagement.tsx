// src/pages/admin/UserManagement.tsx
// Clean layout — search on its own row, no field chips.
// Visitors/Admins tabs, Block/Unblock confirm, Revoke super-admin only.
import { useState, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Users, Shield, ShieldOff, ShieldX,
  Loader2, AlertTriangle, Crown, X,
} from 'lucide-react';
import { supabase }  from '@/lib/supabase';
import { sanitizeHTML } from '@/lib/security';
import {
  useAuth, checkIsSuperAdmin,
  ADMIN_EMAILS, SUPER_ADMIN_EMAIL,
} from '@/hooks/useAuth';
import { useVisitors }    from '@/hooks/useStats';
import { fmtDate, getCollegeAbbr, getCourseAbbr } from '@/lib/utils';
import { useSearch, buildVisitorSearchFields } from '@/hooks/useSearch';
import { SearchBar }      from '@/components/admin/SearchBar';
import { PageHeader }     from '@/components/layout/AdminSidebar';
import type { Visitor }   from '@/types';

// ── Confirm modal ─────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel, danger,
  onConfirm, onCancel, busy,
}: {
  title: string; message: React.ReactNode; confirmLabel: string;
  danger: boolean; busy: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden"
        style={{ animation: 'scaleIn .2s ease-out' }}
      >
        <div className={`px-6 pt-6 pb-4 text-center ${danger ? 'bg-red-600' : 'bg-green-600'}`}>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={26} className="text-white" />
          </div>
          <h3 className="text-white font-black text-lg">{title}</h3>
        </div>
        <div className="px-6 py-5 text-center">
          <div className="text-slate-600 text-sm leading-relaxed mb-6">{message}</div>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={busy}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 border-2 border-slate-200 hover:border-slate-300 transition-all">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={busy}
              className={`flex-1 py-3 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all ${
                danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes scaleIn{from{transform:scale(.88);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── Admin rows ────────────────────────────────────────────────────────
type AdminRow = { email: string; label: string; isSuper: boolean };
const ADMIN_ROWS: AdminRow[] = [
  { email: SUPER_ADMIN_EMAIL,         label: 'Jomar A. Auditor',   isSuper: true  },
  { email: 'jcesperanza@neu.edu.ph',  label: 'Prof. J. Esperanza', isSuper: false },
  { email: 'rene.espina@neu.edu.ph',  label: 'Rene Espina',        isSuper: false },
];

// ── Highlight helper with XSS protection ──────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────
export default function UserManagement() {
  const qc         = useQueryClient();
  const { user }   = useAuth();
  const superAdmin = checkIsSuperAdmin(user?.email);

  const [activeTab,    setActiveTab]    = useState<'visitors' | 'admins'>('visitors');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [blockTarget,  setBlockTarget]  = useState<Visitor | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminRow | null>(null);

  const { data: allVisitors = [], isLoading } = useVisitors('');

  // Real-time updates are now handled in useVisitors hook

  // Global case-insensitive search
  const {
    searchValue, setSearch, filtered,
    resultCount, totalCount: localTotal,
    isFiltering, clearSearch,
  } = useSearch(allVisitors as Visitor[], buildVisitorSearchFields as any);

  // Dropdown filters on top of search
  const finalVisitors = useMemo(() => (filtered as Visitor[]).filter(v => {
    if (filterType   && v.visitor_type !== filterType)           return false;
    if (filterStatus === 'active'  && v.is_blocked)              return false;
    if (filterStatus === 'blocked' && !v.is_blocked)             return false;
    return true;
  }), [filtered, filterType, filterStatus]);

  const counts = useMemo(() => ({
    visitors: (allVisitors as Visitor[]).length,
    admins:   ADMIN_ROWS.length,
    blocked:  (allVisitors as Visitor[]).filter(v => v.is_blocked).length,
    active:   (allVisitors as Visitor[]).filter(v => !v.is_blocked).length,
  }), [allVisitors]);

  const hasDropFilter = !!(filterType || filterStatus);
  const clearAll = () => { clearSearch(); setFilterType(''); setFilterStatus(''); };

  // Mutations
  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }): Promise<void> => {
      const { error } = await supabase.from('visitors').update({ is_blocked: blocked }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitors'] }); setBlockTarget(null); },
  });

  const revokeMutation = useMutation({
    mutationFn: async (email: string): Promise<void> => {
      // Delete profile to revoke admin access
      const { error } = await supabase.from('profiles').delete().eq('email', email.toLowerCase().trim());
      if (error) throw error;
      
      // Force sign out the user by deleting their session
      // Get all sessions for this email and delete them
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const targetUser = authUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (targetUser) {
        // Sign out all sessions for this user
        await supabase.auth.admin.signOut(targetUser.id);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitors'] }); setRevokeTarget(null); },
  });

  return (
    <>
      <PageHeader title="User Management" subtitle="Manage library visitors and admin access" />

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setActiveTab('visitors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black transition-all ${
            activeTab === 'visitors'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
          }`}>
          <Users size={15} /> Visitors ({counts.visitors})
        </button>
        <button onClick={() => setActiveTab('admins')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black transition-all ${
            activeTab === 'admins'
              ? 'bg-blue-700 text-white shadow-md'
              : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
          }`}>
          <Crown size={15} /> Admins ({counts.admins})
        </button>
      </div>

      {/* ── VISITORS TAB ── */}
      {activeTab === 'visitors' && (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: 'Total Visitors', value: counts.visitors, color: 'text-blue-600',  bg: 'bg-blue-50'  },
              { label: 'Active',         value: counts.active,   color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Blocked',        value: counts.blocked,  color: 'text-red-600',   bg: 'bg-red-50'   },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm text-center">
                <p className={`text-3xl font-black ${color}`}>{value}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Search row ── */}
          <div className="flex items-center gap-3 mb-4">
            {/* Search bar — wide */}
            <div className="flex-1 max-w-xl">
              <SearchBar
                value={searchValue}
                onChange={v => setSearch(v)}
                onClear={clearSearch}
                placeholder="Search by name, email, college, course, Active, Blocked, date…"
                resultCount={resultCount}
                totalCount={localTotal}
                isFiltering={isFiltering}
              />
            </div>

            {/* Type dropdown */}
            <select
              className="input text-sm py-3 w-36 shrink-0"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>

            {/* Status dropdown */}
            <select
              className="input text-sm py-3 w-36 shrink-0"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>

            {/* Clear all */}
            {(isFiltering || hasDropFilter) && (
              <button onClick={clearAll}
                className="flex items-center gap-1 px-3 py-3 rounded-xl text-sm font-bold text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all whitespace-nowrap">
                <X size={14} /> Clear
              </button>
            )}

            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium whitespace-nowrap ml-auto">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <Users size={15} className="text-slate-400" />
              <span className="font-black text-slate-700 text-sm">Registered Members</span>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {isFiltering || hasDropFilter
                  ? `${finalVisitors.length} of ${counts.visitors}`
                  : counts.visitors.toLocaleString()}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin text-blue-400" />
              </div>
            ) : finalVisitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users size={34} className="text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-400">
                  {isFiltering || hasDropFilter
                    ? 'No members match your search'
                    : 'No members registered yet'}
                </p>
                {(isFiltering || hasDropFilter) && (
                  <button onClick={clearAll}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 font-semibold">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Member','Type','College','Course / Dept','Registered','Status','Actions'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {finalVisitors.map((v: Visitor) => {
                      const college = getCollegeAbbr(v as any);
                      const course  = getCourseAbbr(v as any);
                      const isSelf  = v.email.toLowerCase() === (user?.email ?? '').toLowerCase();
                      return (
                        <tr key={v.id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-black shrink-0">
                                {sanitizeHTML(v.full_name[0]).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <Highlight text={v.full_name} query={searchValue}
                                  className="text-xs font-bold text-slate-700 block truncate max-w-[140px]" />
                                <Highlight text={v.email} query={searchValue}
                                  className="text-[10px] text-slate-400 block truncate max-w-[160px]" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                              v.visitor_type === 'student'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-violet-100 text-violet-700'
                            }`}>
                              {v.visitor_type === 'faculty' ? 'Faculty' : 'Student'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Highlight text={college} query={searchValue}
                              className="text-xs font-bold text-slate-700 whitespace-nowrap" />
                          </td>
                          <td className="px-4 py-3">
                            <Highlight text={course} query={searchValue}
                              className="text-xs font-bold text-slate-600 whitespace-nowrap" />
                          </td>
                          <td className="px-4 py-3">
                            <Highlight text={fmtDate(v.created_at)} query={searchValue}
                              className="text-xs text-slate-400 whitespace-nowrap" />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${
                              v.is_blocked
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {v.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {!isSelf && (
                              <button
                                onClick={() => setBlockTarget(v)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
                                  v.is_blocked
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                              >
                                {v.is_blocked
                                  ? <><Shield size={10} /> Unblock</>
                                  : <><ShieldOff size={10} /> Block</>}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── ADMINS TAB ── */}
      {activeTab === 'admins' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Crown size={15} className="text-amber-500" />
              <span className="font-black text-slate-700 text-sm">Authorized Administrators</span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {ADMIN_ROWS.length}
              </span>
            </div>
            {!superAdmin && (
              <span className="text-[10px] text-slate-400 font-medium italic">
                Revoke available to Super Admin only
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Administrator','Domain','Role','Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ADMIN_ROWS.map(admin => {
                  const isSelf = admin.email.toLowerCase() === (user?.email ?? '').toLowerCase();
                  return (
                    <tr key={admin.email} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg,#003087,#0050C8)' }}
                          >
                            {admin.label[0]}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-slate-700">{sanitizeHTML(admin.label)}</p>
                            {admin.isSuper && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-700">
                                <Crown size={8} /> Super
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Domain only — full email stays confidential */}
                      <td className="px-4 py-3 text-xs text-slate-400 font-medium">@neu.edu.ph</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                          <Shield size={9} />
                          {admin.isSuper ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {superAdmin && !isSelf && !admin.isSuper ? (
                          <button
                            onClick={() => setRevokeTarget(admin)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-orange-100 text-orange-700 hover:bg-orange-200 transition-all whitespace-nowrap"
                          >
                            <ShieldX size={10} /> Revoke
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Block/Unblock confirm */}
      {blockTarget && (
        <ConfirmModal
          title={blockTarget.is_blocked ? 'Unblock User' : 'Block User'}
          confirmLabel={blockTarget.is_blocked ? 'Yes, Unblock' : 'Yes, Block'}
          danger={!blockTarget.is_blocked}
          busy={blockMutation.isPending}
          onCancel={() => setBlockTarget(null)}
          onConfirm={() => blockMutation.mutate({ id: blockTarget.id, blocked: !blockTarget.is_blocked })}
          message={
            <span>
              Are you sure you want to{' '}
              <strong>{blockTarget.is_blocked ? 'Unblock' : 'Block'}</strong>{' '}
              <strong>{blockTarget.full_name}</strong>?
              <span className={`block mt-2 text-xs font-semibold ${
                blockTarget.is_blocked ? 'text-green-600' : 'text-red-600'
              }`}>
                {blockTarget.is_blocked
                  ? 'This user will regain full access to the library portal.'
                  : 'This user will be immediately prevented from signing in.'}
              </span>
            </span>
          }
        />
      )}

      {/* Revoke confirm */}
      {revokeTarget && (
        <ConfirmModal
          title="Revoke Admin Access"
          confirmLabel="Revoke Access"
          danger={true}
          busy={revokeMutation.isPending}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => revokeMutation.mutate(revokeTarget.email)}
          message={
            <span>
              Are you sure you want to revoke admin access for{' '}
              <strong>{revokeTarget.label}</strong>?
              <span className="block mt-2 text-xs text-red-600 font-semibold">
                Their admin privileges will be removed immediately.
                They will see "Unauthorized" on their next visit.
              </span>
            </span>
          }
        />
      )}
    </>
  );
}