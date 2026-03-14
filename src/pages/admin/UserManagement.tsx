// =====================================================================
// NEU Library Visitor Log System
// Admin: User Management Page
// File: src/pages/admin/UserManagement.tsx
// =====================================================================
// NOTE: AdminLayout wrapper has been REMOVED from this file.
//       Layout is now handled by the nested route in App.tsx.
//       This component only renders the page content.
// =====================================================================

import { useState } from 'react';
import {
  Search, Shield, ShieldOff, Users, CheckCircle2, Loader2, X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { supabase } from '@/lib/supabase';
import { fmtDate } from '@/lib/utils';
import { Student } from '@/types';

async function fetchStudents(search: string): Promise<Student[]> {
  let query = supabase
    .from('students')
    .select(`
      id, name, email, student_number,
      qr_code_data,
      is_blocked, created_at, updated_at,
      program_id,
      programs ( name, colleges ( name ) )
    `)
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error('Failed to load students: ' + error.message);
  return (data ?? []) as unknown as Student[];
}

async function toggleBlock(studentId: string, isBlocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('students')
    .update({ is_blocked: isBlocked })
    .eq('id', studentId);
  if (error) throw new Error('Failed to update student: ' + error.message);
}

export default function UserManagement() {
  const qc = useQueryClient();
  const [search,         setSearch]         = useState('');
  const [confirmStudent, setConfirmStudent] = useState<Student | null>(null);
  const [actionType,     setActionType]     = useState<'block' | 'unblock'>('block');
  const [toastMsg,       setToastMsg]       = useState('');

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students', search],
    queryFn:  () => fetchStudents(search),
    staleTime: 15_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, blocked }: { id: string; blocked: boolean }) =>
      toggleBlock(id, blocked),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setConfirmStudent(null);
      setToastMsg(
        vars.blocked
          ? 'Student has been blocked from library access.'
          : 'Student has been unblocked and can now access the library.'
      );
      setTimeout(() => setToastMsg(''), 4000);
    },
    onError: (err: any) => {
      alert('Error: ' + (err?.message ?? 'Please try again.'));
    },
  });

  const openConfirm = (student: Student, type: 'block' | 'unblock') => {
    setConfirmStudent(student);
    setActionType(type);
  };

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="View and manage registered library students"
      />

      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 animate-scale-in">
          <div className="bg-white border border-neu-border shadow-card-md rounded-2xl px-5 py-3.5 flex items-center gap-3 max-w-sm">
            <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            <p className="text-sm font-medium text-slate-700">{toastMsg}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card-p mb-5 animate-fade-up">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by name, email, or student number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card animate-fade-up overflow-hidden">
        <div className="px-6 py-4 border-b border-neu-border flex items-center gap-2">
          <Users size={15} className="text-neu-blue" />
          <span className="text-sm font-bold text-slate-800">Registered Students</span>
          <span className="text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">
            {students.length.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neu-gray border-b border-neu-border">
                {[
                  { label: 'Student',     cls: 'min-w-[180px]' },
                  { label: 'Student No.', cls: 'min-w-[130px]' },
                  { label: 'College',     cls: 'min-w-[220px]' },
                  { label: 'Program',     cls: 'min-w-[240px]' },
                  { label: 'Status',      cls: 'min-w-[90px]'  },
                  { label: 'Registered',  cls: 'min-w-[110px]' },
                  { label: 'Action',      cls: 'min-w-[100px]' },
                ].map(h => (
                  <th key={h.label}
                    className={`text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${h.cls}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-neu-border/50">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-3.5 bg-gray-100 rounded animate-pulse w-28" />
                    </td>
                  ))}
                </tr>
              ))}

              {!isLoading && students.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <Users size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-semibold text-sm">No students found</p>
                    <p className="text-xs mt-1">
                      Students appear here after they register at /register
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading && students.map(student => {
                const s       = student as any;
                const college = s.programs?.colleges?.name ?? '—';
                const program = s.programs?.name           ?? '—';
                return (
                  <tr key={student.id}
                    className={`border-b border-neu-border/40 hover:bg-neu-gray/50 transition-colors ${
                      student.is_blocked ? 'bg-red-50/30' : ''
                    }`}>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-slate-800 whitespace-nowrap">
                        {student.name}
                      </p>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">
                        {student.email}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {student.student_number}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-600 leading-snug max-w-[220px]">
                        {college}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-slate-600 leading-snug max-w-[240px]">
                        {program}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      {student.is_blocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                          <ShieldOff size={10} />Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                          <Shield size={10} />Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(student.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      {student.is_blocked ? (
                        <button onClick={() => openConfirm(student, 'unblock')}
                          className="text-xs font-semibold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 transition-all">
                          Unblock
                        </button>
                      ) : (
                        <button onClick={() => openConfirm(student, 'block')}
                          className="text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-all">
                          Block
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                  actionType === 'block' ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  {actionType === 'block'
                    ? <ShieldOff size={20} className="text-red-500" />
                    : <Shield    size={20} className="text-green-600" />}
                </div>
                <button onClick={() => setConfirmStudent(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400">
                  <X size={16} />
                </button>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                {actionType === 'block' ? 'Block Student?' : 'Unblock Student?'}
              </h3>
              <p className="text-sm text-slate-500 mb-1">
                <span className="font-semibold text-slate-700">{confirmStudent.name}</span>
              </p>
              <p className="text-xs text-slate-400 mb-5">
                {actionType === 'block'
                  ? 'This student will not be able to log any library visits until unblocked.'
                  : 'This student will be able to log library visits again.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmStudent(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neu-border text-sm font-semibold text-slate-600 hover:bg-neu-gray transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => mutation.mutate({ id: confirmStudent.id, blocked: actionType === 'block' })}
                  disabled={mutation.isPending}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                    actionType === 'block'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}>
                  {mutation.isPending
                    ? <><Loader2 size={14} className="animate-spin" />Saving...</>
                    : actionType === 'block' ? 'Block Student' : 'Unblock Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}