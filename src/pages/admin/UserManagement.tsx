import { useState } from 'react';
import {
  Search, Shield, ShieldOff, Users, CheckCircle2, Loader2, X,
  Crown, ChevronDown, AlertTriangle, UserCheck,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { supabase }   from '@/lib/supabase';
import { fmtDate }    from '@/lib/utils';
import { Visitor }    from '@/types';

interface ProfileRow {
  id: string; email: string; full_name: string; role: string; created_at: string;
}

async function fetchVisitors(search: string): Promise<Visitor[]> {
  let q = supabase.from('visitors')
    .select('id, full_name, email, visitor_type, student_number, is_blocked, created_at, program_id, college_id, programs ( name, colleges ( name ) ), colleges ( name )')
    .order('created_at', { ascending: false });
  if (search.trim())
    q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Visitor[];
}

async function fetchProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles')
    .select('id, email, full_name, role, created_at').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function UserManagement() {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [tab,       setTab]       = useState<'visitors' | 'admins'>('visitors');
  const [toast,     setToast]     = useState('');
  const [modal,     setModal]     = useState<{
    type: 'block'|'unblock'|'promote'|'demote'|'change-type';
    visitor?: Visitor; profile?: ProfileRow; newType?: string;
  } | null>(null);

  const { data: visitors = [], isLoading: vLoading } = useQuery({
    queryKey: ['visitors', search], queryFn: () => fetchVisitors(search), staleTime: 15_000,
  });
  const { data: profiles = [], isLoading: pLoading } = useQuery({
    queryKey: ['admin-profiles'], queryFn: fetchProfiles, staleTime: 30_000,
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // FIX: All mutationFn use explicit async (): Promise<void>
  const blockMut = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }): Promise<void> => {
      const { error } = await supabase.from('visitors').update({ is_blocked: blocked }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['visitors'] });
      setModal(null);
      showToast(v.blocked ? 'Visitor blocked.' : 'Visitor unblocked.');
    },
    onError: (e: any) => alert('Error: ' + e?.message),
  });

  const typeMut = useMutation({
    mutationFn: async ({ id, vt }: { id: string; vt: string }): Promise<void> => {
      const { error } = await supabase.from('visitors').update({ visitor_type: vt }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['visitors'] });
      setModal(null);
      showToast(`Visitor type changed to ${v.vt}.`);
    },
    onError: (e: any) => alert('Error: ' + e?.message),
  });

  const promoteMut = useMutation({
    mutationFn: async ({ visitor }: { visitor: Visitor }): Promise<void> => {
      const { error } = await supabase.from('profiles').upsert({
        id: visitor.id, email: visitor.email, full_name: visitor.full_name,
        role: 'admin', created_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      setModal(null);
      showToast('User promoted to admin.');
    },
    onError: (e: any) => alert('Error: ' + e?.message),
  });

  const demoteMut = useMutation({
    mutationFn: async ({ profileId }: { profileId: string }): Promise<void> => {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-profiles'] });
      setModal(null);
      showToast('Admin access revoked.');
    },
    onError: (e: any) => alert('Error: ' + e?.message),
  });

  const isPending = blockMut.isPending || typeMut.isPending || promoteMut.isPending || demoteMut.isPending;

  const handleConfirm = () => {
    if (!modal) return;
    if (modal.type === 'block'       && modal.visitor) blockMut.mutate({ id: modal.visitor.id, blocked: true });
    else if (modal.type === 'unblock' && modal.visitor) blockMut.mutate({ id: modal.visitor.id, blocked: false });
    else if (modal.type === 'promote' && modal.visitor) promoteMut.mutate({ visitor: modal.visitor });
    else if (modal.type === 'demote'  && modal.profile) demoteMut.mutate({ profileId: modal.profile.id });
    else if (modal.type === 'change-type' && modal.visitor && modal.newType)
      typeMut.mutate({ id: modal.visitor.id, vt: modal.newType });
  };

  return (
    <>
      <PageHeader title="User Management" subtitle="Manage library visitors and admin access" />

      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-scale-in">
          <div className="bg-white border border-neu-border shadow-card-md rounded-2xl px-5 py-3.5 flex items-center gap-3 max-w-sm">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <p className="text-sm font-medium text-slate-700">{toast}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 animate-fade-up">
        {(['visitors','admins'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              tab === t ? 'bg-neu-blue text-white shadow-sm' : 'bg-white border border-neu-border text-slate-500 hover:text-neu-blue'
            }`}>
            {t === 'visitors' ? <><Users size={14} />Visitors ({visitors.length})</> : <><Crown size={14} />Admins ({profiles.length})</>}
          </button>
        ))}
      </div>

      {/* VISITORS TAB */}
      {tab === 'visitors' && (
        <>
          <div className="card-p mb-5 animate-fade-up">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" className="input pl-9" placeholder="Search by name, email, or student number..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="card animate-fade-up overflow-hidden">
            <div className="px-6 py-4 border-b border-neu-border flex items-center gap-2">
              <Users size={15} className="text-neu-blue" />
              <span className="text-sm font-bold text-slate-800">Registered Visitors</span>
              <span className="ml-1 text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">{visitors.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neu-gray border-b border-neu-border">
                    {['Visitor','Type','ID / SN','College / Program','Status','Registered','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vLoading && [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-neu-border/50">
                      {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded animate-pulse w-24" /></td>)}
                    </tr>
                  ))}
                  {!vLoading && visitors.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                      <Users size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" />
                      <p className="font-semibold text-sm">No visitors found</p>
                    </td></tr>
                  )}
                  {!vLoading && visitors.map(v => {
                    const vt = (v as any).visitor_type ?? 'student';
                    const college = (v as any).programs?.colleges?.name ?? (v as any).colleges?.name ?? '—';
                    const program = (v as any).programs?.name ?? '—';
                    return (
                      <tr key={v.id} className={`border-b border-neu-border/40 hover:bg-neu-gray/50 transition-colors ${v.is_blocked ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-800 whitespace-nowrap">{v.full_name}</p>
                          <p className="text-[11px] text-slate-400 whitespace-nowrap">{v.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="relative">
                            <select value={vt}
                              onChange={e => setModal({ type:'change-type', visitor: v, newType: e.target.value })}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer appearance-none pr-6 ${
                                vt === 'student' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                vt === 'faculty' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              <option value="student">Student</option>
                              <option value="faculty">Faculty</option>
                              <option value="staff">Staff</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">{v.student_number ?? '—'}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-slate-600">{college}</p>
                          <p className="text-[11px] text-slate-400">{program}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {v.is_blocked
                            ? <span className="badge-red"><ShieldOff size={10} />Blocked</span>
                            : <span className="badge-green"><Shield size={10} />Active</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(v.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1.5 flex-wrap">
                            {v.is_blocked
                              ? <button onClick={() => setModal({type:'unblock',visitor:v})} className="text-xs font-semibold text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100 transition-all">Unblock</button>
                              : <button onClick={() => setModal({type:'block',visitor:v})} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 transition-all">Block</button>}
                            <button onClick={() => setModal({type:'promote',visitor:v})}
                              className="text-xs font-semibold text-neu-blue hover:bg-neu-light px-2.5 py-1.5 rounded-lg border border-neu-border transition-all">
                              <Crown size={10} className="inline mr-1" />Admin
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ADMINS TAB */}
      {tab === 'admins' && (
        <div className="card animate-fade-up overflow-hidden">
          <div className="px-6 py-4 border-b border-neu-border flex items-center gap-2">
            <Crown size={15} className="text-neu-blue" />
            <span className="text-sm font-bold text-slate-800">Admin Accounts</span>
            <span className="ml-1 text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">{profiles.length}</span>
          </div>
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Revoking admin removes dashboard access but keeps the visitor record.</p>
          </div>
          {pLoading
            ? <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-neu-blue mx-auto" /></div>
            : profiles.length === 0
              ? <div className="text-center py-12 text-slate-400"><Crown size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">No admins yet.</p></div>
              : <div className="divide-y divide-neu-border">
                  {profiles.map(p => (
                    <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-neu-gray/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neu-blue flex items-center justify-center text-white font-bold text-sm">
                          {(p.full_name?.[0] ?? p.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.full_name}</p>
                          <p className="text-xs text-slate-400">{p.email}</p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neu-blue bg-neu-light px-2 py-0.5 rounded-full mt-0.5">
                            <Crown size={8} />{p.role}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setModal({type:'demote',profile:p})}
                        className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all whitespace-nowrap">
                        Revoke Admin
                      </button>
                    </div>
                  ))}
                </div>}
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  ['block','demote'].includes(modal.type) ? 'bg-red-100' :
                  modal.type === 'promote'     ? 'bg-blue-100'   :
                  modal.type === 'change-type' ? 'bg-purple-100' : 'bg-green-100'
                }`}>
                  {['block','demote'].includes(modal.type) && <ShieldOff size={20} className="text-red-500" />}
                  {modal.type === 'unblock'     && <Shield    size={20} className="text-green-600" />}
                  {modal.type === 'promote'     && <Crown     size={20} className="text-neu-blue" />}
                  {modal.type === 'change-type' && <UserCheck size={20} className="text-purple-600" />}
                </div>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400"><X size={16} /></button>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {modal.type === 'block'       && 'Block Visitor?'}
                {modal.type === 'unblock'     && 'Unblock Visitor?'}
                {modal.type === 'promote'     && 'Promote to Admin?'}
                {modal.type === 'demote'      && 'Revoke Admin Access?'}
                {modal.type === 'change-type' && `Change type to "${modal.newType}"?`}
              </h3>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {modal.visitor?.full_name ?? modal.profile?.full_name}
              </p>
              <p className="text-xs text-slate-400 mb-5">
                {modal.type === 'block'       && 'Cannot log library visits until unblocked.'}
                {modal.type === 'unblock'     && 'Will be able to log library visits again.'}
                {modal.type === 'promote'     && 'Gets full dashboard and admin access.'}
                {modal.type === 'demote'      && 'Loses dashboard access but keeps visitor record.'}
                {modal.type === 'change-type' && 'Visitor classification will be updated in all reports.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neu-border text-sm font-semibold text-slate-600 hover:bg-neu-gray transition-all">
                  Cancel
                </button>
                <button onClick={handleConfirm} disabled={isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                    ['block','demote'].includes(modal.type) ? 'bg-red-500 hover:bg-red-600' :
                    modal.type === 'promote' ? 'bg-neu-blue hover:bg-neu-mid' :
                    'bg-green-500 hover:bg-green-600'
                  }`}>
                  {isPending ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}