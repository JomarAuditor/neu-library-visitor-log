import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Users, Ban, CheckCircle2, QrCode,
  AlertTriangle, Loader2, GraduationCap,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/layout/AdminSidebar';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types';
import { fmtDate } from '@/lib/utils';

async function getStudents(search: string): Promise<Student[]> {
  let q = supabase.from('students').select('*').order('created_at', { ascending: false });
  if (search.trim()) {
    const s = `%${search.toLowerCase()}%`;
    q = q.or(`name.ilike.${s},email.ilike.${s},student_number.ilike.${s},college.ilike.${s},course.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as Student[]) ?? [];
}

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; name: string; block: boolean } | null>(null);
  const qc = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => getStudents(search),
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, block }: { id: string; block: boolean }) => {
      const { error } = await supabase.from('students').update({ is_blocked: block }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); setConfirm(null); },
  });

  const stats = {
    total: students.length,
    active: students.filter(s => !s.is_blocked).length,
    blocked: students.filter(s => s.is_blocked).length,
    withQR: students.filter(s => !!s.qr_code_data).length,
  };

  return (
    <AdminLayout>
      <PageHeader title="User Management" subtitle="Manage registered library users" />

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 animate-fade-up">
        {[
          { l: 'Total Students',  v: stats.total,   c: 'text-neu-blue'   },
          { l: 'Active',          v: stats.active,  c: 'text-green-600'  },
          { l: 'Blocked',         v: stats.blocked, c: 'text-red-500'    },
          { l: 'With QR Code',    v: stats.withQR,  c: 'text-purple-600' },
        ].map(s => (
          <div key={s.l} className="card-p py-4">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card-p mb-4 animate-fade-up delay-1">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" className="input pl-9"
            placeholder="Search by name, email, student number, college, or course…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card animate-fade-up delay-2 overflow-hidden">
        <div className="px-6 py-4 border-b border-neu-border flex items-center gap-2">
          <Users size={15} className="text-neu-blue" />
          <span className="text-sm font-bold text-slate-800">Registered Students</span>
          <span className="text-xs bg-neu-light text-neu-blue px-2 py-0.5 rounded-full font-semibold">{students.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neu-gray border-b border-neu-border">
                {['Student','Student No.','College','Course','QR Code','Registered','Status','Action'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-neu-border/50">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-3.5 bg-gray-100 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <GraduationCap size={38} strokeWidth={1} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-semibold text-sm">No students found</p>
                    <p className="text-xs mt-1">Students appear here after they register via QR code</p>
                  </td>
                </tr>
              ) : students.map(s => (
                <tr key={s.id} className="border-b border-neu-border/40 hover:bg-neu-gray/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-semibold text-slate-800">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600 font-mono">{s.student_number}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[130px]">
                    <span className="truncate block">{s.college}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-medium text-slate-600">{s.course}</td>
                  <td className="px-5 py-3.5">
                    {s.qr_code_data
                      ? <span className="badge-green"><QrCode size={10} />Generated</span>
                      : <span className="badge-gray">None</span>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                  <td className="px-5 py-3.5">
                    {s.is_blocked
                      ? <span className="badge-red"><Ban size={10} />Blocked</span>
                      : <span className="badge-green"><CheckCircle2 size={10} />Active</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setConfirm({ id: s.id, name: s.name, block: !s.is_blocked })}
                      className={s.is_blocked ? 'btn-success text-xs py-1.5 px-3' : 'btn-danger text-xs py-1.5 px-3'}>
                      {s.is_blocked ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-card-lg max-w-sm w-full p-6 animate-scale-in">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${confirm.block ? 'bg-red-50' : 'bg-green-50'}`}>
              <AlertTriangle size={22} className={confirm.block ? 'text-red-500' : 'text-green-600'} />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">
              {confirm.block ? 'Block Student?' : 'Unblock Student?'}
            </h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              {confirm.block
                ? `"${confirm.name}" will no longer be able to log library visits.`
                : `"${confirm.name}" will be able to log library visits again.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button
                onClick={() => toggleBlock.mutate({ id: confirm.id, block: confirm.block })}
                disabled={toggleBlock.isPending}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all ${
                  confirm.block ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'
                }`}>
                {toggleBlock.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : confirm.block ? 'Yes, Block' : 'Yes, Unblock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
