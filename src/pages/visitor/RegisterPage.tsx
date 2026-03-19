// src/pages/visitor/RegisterPage.tsx
import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ChevronDown, GraduationCap, Users, AlertCircle } from 'lucide-react';
import { supabase }         from '@/lib/supabase';
import { useAuth }          from '@/hooks/useAuth';
import { useColleges, useAllPrograms } from '@/hooks/useStats';
import { PURPOSES, VisitPurpose, VisitorType, PURPOSE_EMOJI } from '@/types';

export default function RegisterPage() {
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const { user, signOut } = useAuth();

  const prefillEmail = params.get('email') ?? user?.email ?? '';
  const prefillName  = params.get('name')  ?? user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '';

  const [vType,      setVType]      = useState<VisitorType>('student');
  const [fullName,   setFullName]   = useState(prefillName);
  const [collegeId,  setCollegeId]  = useState<number | null>(null);
  const [programId,  setProgramId]  = useState<number | null>(null);
  const [department, setDepartment] = useState('');
  const [purpose,    setPurpose]    = useState<VisitPurpose | null>(null);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  const { data: colleges = [], isLoading: cLoading } = useColleges();
  const { data: allPrograms = [] }                    = useAllPrograms();

  const programs  = collegeId ? allPrograms.filter(p => p.college_id === collegeId) : [];
  const isStudent = vType === 'student';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!fullName.trim())        { setError('Please enter your full name.');            return; }
    if (!prefillEmail)           { setError('No email detected. Please sign in again.'); return; }
    if (isStudent && !collegeId) { setError('Please select your college.');             return; }
    if (isStudent && !programId) { setError('Please select your course.');              return; }
    if (!purpose)                { setError('Please select your reason for visiting.');  return; }

    setLoading(true);
    try {
      const email = prefillEmail.toLowerCase().trim();
      const { data: existing } = await supabase.from('visitors').select('id').eq('email', email).maybeSingle();
      let vid: string;

      if (existing) {
        vid = existing.id;
      } else {
        const { data: nv, error: ie } = await supabase.from('visitors')
          .insert({
            email, full_name: fullName.trim(), visitor_type: vType,
            college_id: collegeId ?? null,
            program_id: isStudent ? programId : null,
            department: !isStudent && department.trim() ? department.trim() : null,
            is_blocked: false,
          }).select('id').single();
        if (ie) {
          if (ie.code === '23505') {
            const { data: d } = await supabase.from('visitors').select('id').eq('email', email).single();
            vid = d!.id;
          } else throw ie;
        } else { vid = nv!.id; }
      }

      const now = new Date().toISOString();
      await supabase.from('visit_logs').insert({ visitor_id: vid, purpose, time_in: now, visit_date: now.split('T')[0] });
      navigate(`/?registered=1&name=${encodeURIComponent(fullName.trim())}`, { replace: true });
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img src="/Neu-Lib_Building.jpg" alt="" className="w-full h-full object-cover object-center"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(0,30,120,0.82) 0%, rgba(0,48,135,0.78) 50%, rgba(13,30,60,0.85) 100%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/neu-logo.svg" alt="NEU" className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-2xl"
            onError={e => { const i = e.currentTarget as HTMLImageElement; if (!i.dataset.tried) { i.dataset.tried='1'; i.src='/NEU%20Library%20logo.png'; } }} />
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Welcome to NEU Library!
          </h1>
          <p className="text-white/60 text-sm mt-1">Let's set up your visitor profile to get started.</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-blue-600/10 border-b border-blue-200/40 px-6 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0">
              {(prefillName?.[0] ?? prefillEmail[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{prefillEmail}</p>
              <p className="text-[10px] text-slate-400">First-time visitor — one-time setup</p>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-600 font-semibold">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Visitor type */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">I am a…</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['student', GraduationCap, 'Student',        'Currently enrolled'],
                    ['faculty', Users,         'Faculty / Staff', 'Instructor or staff'],
                  ] as const).map(([vt, Icon, label, sub]) => (
                    <button key={vt} type="button"
                      onClick={() => { setVType(vt as VisitorType); setCollegeId(null); setProgramId(null); setDepartment(''); }}
                      className="py-3.5 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all"
                      style={{ borderColor: vType === vt ? '#2563EB' : '#E2E8F0', background: vType === vt ? '#EFF6FF' : '#FAFAFA' }}>
                      <Icon size={20} style={{ color: vType === vt ? '#2563EB' : '#94A3B8' }} />
                      <span className="text-xs font-black" style={{ color: vType === vt ? '#2563EB' : '#475569' }}>{label}</span>
                      <span className="text-[9px] font-medium" style={{ color: vType === vt ? '#93C5FD' : '#CBD5E1' }}>{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input type="text" placeholder="Juan dela Cruz"
                  className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>

              {/* Student fields */}
              {isStudent && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">College</label>
                    <div className="relative">
                      <select className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white appearance-none pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50"
                        value={collegeId ?? ''} disabled={cLoading} required
                        onChange={e => { setCollegeId(e.target.value ? Number(e.target.value) : null); setProgramId(null); }}>
                        <option value="">{cLoading ? 'Loading…' : 'Select your college'}</option>
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Course {!collegeId && <span className="text-[9px] normal-case font-normal text-slate-300 ml-1">(select college first)</span>}
                    </label>
                    <div className="relative">
                      <select className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white appearance-none pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        value={programId ?? ''} disabled={!collegeId} required
                        onChange={e => setProgramId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">{!collegeId ? 'Select college first' : 'Select your course'}</option>
                        {/* Use abbreviation only for display */}
                        {programs.map(p => <option key={p.id} value={p.id}>{p.abbreviation}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* Faculty: department */}
              {!isStudent && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Department / Role <span className="text-[9px] normal-case font-normal text-slate-300 ml-1">(optional)</span>
                  </label>
                  <input type="text" placeholder="e.g. Instructor, College of Engineering"
                    className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    value={department} onChange={e => setDepartment(e.target.value)} />
                </div>
              )}

              {/* Purpose */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reason for Visiting Today</label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSES.map(p => (
                    <button key={p} type="button" onClick={() => setPurpose(p)}
                      className="py-3 rounded-xl border-2 flex items-center gap-2.5 px-3 transition-all"
                      style={{ borderColor: purpose === p ? '#2563EB' : '#E2E8F0', background: purpose === p ? '#EFF6FF' : '#FAFAFA' }}>
                      <span className="text-xl">{PURPOSE_EMOJI[p]}</span>
                      <span className="text-xs font-bold text-left leading-tight" style={{ color: purpose === p ? '#2563EB' : '#64748B' }}>{p}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit"
                disabled={loading || !purpose || (isStudent && (!collegeId || !programId))}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm">
                {loading
                  ? <><Loader2 size={16} className="animate-spin"/>Setting up your profile…</>
                  : 'Complete Registration & Time In'}
              </button>
            </form>

            <button onClick={() => signOut().then(() => navigate('/', { replace: true }))}
              className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors text-center">
              Cancel — use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
