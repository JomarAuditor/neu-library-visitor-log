// src/pages/admin/UserManagement.tsx
// FIXED: mutationFn uses async/await → returns Promise<void> not PromiseLike<void>

import { useState } from 'react';
import {
  Search, Shield, ShieldOff, Users, CheckCircle2, Loader2, X,
  Crown, ChevronDown, AlertTriangle, UserCheck,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { supabase } from '@/lib/supabase';
import { fmtDate } from '@/lib/utils';
import { Student } from '@/types';

interface ProfileRow {
  id: string; email: string; full_name: string; role: string; created_at: string;
}

async function fetchStudents(search: string): Promise<Student[]> {
  let q = supabase.from('students')
    .select('id, name, email, student_number, visitor_type, qr_code_data, is_blocked, created_at, updated_at, program_id, programs ( name, colleges ( name ) )')
    .order('created_at', { ascending: false });
  if (search.trim()) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Student[];
}

async function fetchAdminProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase.from('profiles')
    .select('id, email, full_name, role, created_at').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default function UserManagement() {
  const qc = useQueryClient();
  const [search,       setSearch]       = useState('');
  const [activeTab,    setActiveTab]    = useState<'visitors' | 'admins'>('visitors');
  const [toastMsg,     setToastMsg]     = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    type: 'block' | 'unblock' | 'promote' | 'demote' | 'change-type';
    student?: Student; profile?: ProfileRow; newType?: string;
  } | null>(null);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', search], queryFn: () => fetchStudents(search), staleTime: 15_000,
  });
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'], queryFn: fetchAdminProfiles, staleTime: 30_000,
  });

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000); };

  // KEY FIX: explicit async (): Promise<void> on every mutationFn
  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }): Promise<void> => {
      const { error } = await supabase.from('students').update({ is_blocked: blocked }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['students'] }); setConfirmModal(null); toast(v.blocked ? 'Student blocked.' : 'Student unblocked.'); },
    onError: (e: any) => alert(e?.message),
  });

  const changeTypeMutation = useMutation({
    mutationFn: async ({ id, visitorType }: { id: string; visitorType: string }): Promise<void> => {
      const { error } = await supabase.from('students').update({ visitor_type: visitorType }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['students'] }); setConfirmModal(null); toast(`Type changed to ${v.visitorType}.`); },
    onError: (e: any) => alert(e?.message),
  });

  const promoteMutation = useMutation({
    mutationFn: async ({ student }: { student: Student }): Promise<void> => {
      const { error } = await supabase.from('profiles').upsert(
        { id: student.id, email: student.email, full_name: student.name, role: 'admin', created_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-profiles'] }); setConfirmModal(null); toast('User promoted to admin.'); },
    onError: (e: any) => alert(e?.message),
  });

  const demoteMutation = useMutation({
    mutationFn: async ({ profileId }: { profileId: string }): Promise<void> => {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-profiles'] }); setConfirmModal(null); toast('Admin access revoked.'); },
    onError: (e: any) => alert(e?.message),
  });

  const isPending = blockMutation.isPending || changeTypeMutation.isPending || promoteMutation.isPending || demoteMutation.isPending;

  const handleConfirm = () => {
    const m = confirmModal;
    if (!m) return;
    if (m.type === 'block'       && m.student) blockMutation.mutate({ id: m.student.id, blocked: true });
    else if (m.type === 'unblock' && m.student) blockMutation.mutate({ id: m.student.id, blocked: false });
    else if (m.type === 'promote' && m.student) promoteMutation.mutate({ student: m.student });
    else if (m.type === 'demote'  && m.profile) demoteMutation.mutate({ profileId: m.profile.id });
    else if (m.type === 'change-type' && m.student && m.newType) changeTypeMutation.mutate({ id: m.student.id, visitorType: m.newType });
  };

  return (
    <>
      <PageHeader title="User Management" subtitle="Manage visitors and admin access" />

      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 animate-scale-in">
          <div className="bg-white border border-neu-border shadow-card-md rounded-2xl px-5 py-3.5 flex items-center gap-3 max-w-sm">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <p className="text-sm font-medium text-slate-700">{toastMsg}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        <button onClick={() => setActiveTab('visitors')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'visitors' ? 'bg-neu-blue text-white' : 'bg-white border border-neu-border text-slate-500 hover:text-neu-blue'}`}>
          <Users size={14} />Visitors ({students.length})
        </button>
        <button onClick={() => setActiveTab('admins')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'admins' ? 'bg-neu-blue text-white' : 'bg-white border border-neu-border text-slate-500 hover:text-neu-blue'}`}>
          <Crown size={14} />Admins ({profiles.length})
        </button>
      </div>

      {activeTab === 'visitors' && (
        <>
          <div className="card-p mb-5">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" className="input pl-9" placeholder="Search by name, email, or student number..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-neu-border flex items-center gap-2">
              <Users size={15} className="text-neu-blue" />
              <span className="text-sm font-bold text-slate-800">Registered Visitors</span>
              <span className="ml-1 text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">{students.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neu-gray border-b border-neu-border">
                    {['Visitor','Type','ID No.','College / Program','Status','Registered','Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentsLoading && [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-neu-border/50">
                      {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3.5"><div className="h-3.5 bg-gray-100 rounded animate-pulse w-24" /></td>)}
                    </tr>
                  ))}
                  {!studentsLoading && students.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                      <Users size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" />
                      <p className="font-semibold text-sm">No visitors found</p>
                    </td></tr>
                  )}
                  {!studentsLoading && students.map(student => {
                    const s = student as any;
                    const vType = s.visitor_type ?? 'Student';
                    return (
                      <tr key={student.id} className={`border-b border-neu-border/40 hover:bg-neu-gray/50 transition-colors ${student.is_blocked ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-slate-800 whitespace-nowrap">{student.name}</p>
                          <p className="text-[11px] text-slate-400 whitespace-nowrap">{student.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="relative">
                            <select value={vType}
                              onChange={e => setConfirmModal({ type:'change-type', student, newType: e.target.value })}
                              className={`text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer appearance-none pr-6 ${
                                vType === 'Student' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                vType === 'Faculty' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              <option value="Student">Student</option>
                              <option value="Faculty">Faculty</option>
                              <option value="Staff">Staff</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">{student.student_number}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-slate-600">{s.programs?.colleges?.name ?? '—'}</p>
                          <p className="text-[11px] text-slate-400">{s.programs?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {student.is_blocked
                            ? <span className="badge-red"><ShieldOff size={10} />Blocked</span>
                            : <span className="badge-green"><Shield size={10} />Active</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(student.created_at)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1.5 flex-wrap">
                            {student.is_blocked
                              ? <button onClick={() => setConfirmModal({ type:'unblock', student })} className="text-xs font-semibold text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100 transition-all">Unblock</button>
                              : <button onClick={() => setConfirmModal({ type:'block', student })} className="text-xs font-semibold text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 transition-all">Block</button>}
                            <button onClick={() => setConfirmModal({ type:'promote', student })} className="text-xs font-semibold text-neu-blue hover:bg-neu-light px-2.5 py-1.5 rounded-lg border border-neu-border transition-all">
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

      {activeTab === 'admins' && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-neu-border flex items-center gap-2">
            <Crown size={15} className="text-neu-blue" />
            <span className="text-sm font-bold text-slate-800">Admin Accounts</span>
            <span className="ml-1 text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">{profiles.length}</span>
          </div>
          <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Revoking admin removes dashboard access but does not delete the visitor record.</p>
          </div>
          {profilesLoading
            ? <div className="p-8 text-center"><Loader2 size={24} className="animate-spin text-neu-blue mx-auto" /></div>
            : profiles.length === 0
              ? <div className="text-center py-12 text-slate-400"><Crown size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" /><p className="text-sm">No admins found. Run emergency_fix.sql in Supabase.</p></div>
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neu-blue bg-neu-light px-2 py-0.5 rounded-full uppercase mt-0.5">
                            <Crown size={8} />{p.role}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setConfirmModal({ type:'demote', profile: p })}
                        className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all">
                        Revoke Admin
                      </button>
                    </div>
                  ))}
                </div>}
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${['block','demote'].includes(confirmModal.type) ? 'bg-red-100' : confirmModal.type === 'promote' ? 'bg-blue-100' : confirmModal.type === 'change-type' ? 'bg-purple-100' : 'bg-green-100'}`}>
                  {['block','demote'].includes(confirmModal.type) && <ShieldOff size={20} className="text-red-500" />}
                  {confirmModal.type === 'unblock'     && <Shield    size={20} className="text-green-600" />}
                  {confirmModal.type === 'promote'     && <Crown     size={20} className="text-neu-blue" />}
                  {confirmModal.type === 'change-type' && <UserCheck size={20} className="text-purple-600" />}
                </div>
                <button onClick={() => setConfirmModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400"><X size={16} /></button>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {confirmModal.type === 'block' && 'Block Visitor?'}
                {confirmModal.type === 'unblock' && 'Unblock Visitor?'}
                {confirmModal.type === 'promote' && 'Promote to Admin?'}
                {confirmModal.type === 'demote' && 'Revoke Admin Access?'}
                {confirmModal.type === 'change-type' && `Change type to "${confirmModal.newType}"?`}
              </h3>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {confirmModal.student?.name ?? confirmModal.profile?.full_name}
              </p>
              <p className="text-xs text-slate-400 mb-5">
                {confirmModal.type === 'block' && 'Cannot log library visits until unblocked.'}
                {confirmModal.type === 'unblock' && 'Will be able to log visits again.'}
                {confirmModal.type === 'promote' && 'Gets full dashboard access.'}
                {confirmModal.type === 'demote' && 'Loses dashboard access but keeps visitor record.'}
                {confirmModal.type === 'change-type' && 'Visitor classification will be updated.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 rounded-xl border border-neu-border text-sm font-semibold text-slate-600 hover:bg-neu-gray transition-all">Cancel</button>
                <button onClick={handleConfirm} disabled={isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${['block','demote'].includes(confirmModal.type) ? 'bg-red-500 hover:bg-red-600' : confirmModal.type === 'promote' ? 'bg-neu-blue hover:bg-neu-mid' : 'bg-green-500 hover:bg-green-600'}`}>
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