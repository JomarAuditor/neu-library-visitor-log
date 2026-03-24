// src/pages/visitor/RegisterPage.tsx
// After registration: close any accidental open sessions first,
// then insert exactly ONE time-in record.
// College required for both student and faculty.
import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, GraduationCap, Users, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase }          from '@/lib/supabase';
import { useAuth }           from '@/hooks/useAuth';
import { useColleges, useAllPrograms } from '@/hooks/useStats';
import { PURPOSES, VisitPurpose, VisitorType, PURPOSE_EMOJI } from '@/types';
import { calcDurationMinutes } from '@/lib/utils';

export default function RegisterPage() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
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

  const { data: colleges    = [] } = useColleges();
  const { data: allPrograms = [] } = useAllPrograms();
  const programs = collegeId ? allPrograms.filter(p => p.college_id === collegeId) : [];
  const isStudent = vType === 'student';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim())         { setError('Please enter your full name.'); return; }
    if (!prefillEmail)            { setError('No email detected. Please sign in again.'); return; }
    if (!collegeId)               { setError('Please select your college.'); return; }
    if (isStudent && !programId)  { setError('Please select your course.'); return; }
    if (!purpose)                 { setError('Please select your reason for visiting.'); return; }

    setLoading(true);
    try {
      const email = prefillEmail.toLowerCase().trim();

      // 1. Get or create visitor record
      let vid: string;
      const { data: existing } = await supabase
        .from('visitors').select('id').eq('email', email).maybeSingle();

      if (existing) {
        vid = existing.id;
      } else {
        const { data: nv, error: ie } = await supabase
          .from('visitors')
          .insert({
            email,
            full_name:    fullName.trim(),
            visitor_type: vType,
            college_id:   collegeId,
            program_id:   isStudent ? programId : null,
            department:   !isStudent && department.trim() ? department.trim() : null,
            is_blocked:   false,
          })
          .select('id').single();

        if (ie) {
          // Race condition: visitor was created by another request
          if (ie.code === '23505') {
            const { data: dup } = await supabase.from('visitors').select('id').eq('email', email).single();
            vid = dup!.id;
          } else throw ie;
        } else {
          vid = nv!.id;
        }
      }

      // ══════════════════════════════════════════════════════════════════
      // STEP 2: Close any existing open sessions FIRST (safety net)
      // Prevents duplicates if user registered on another device/tab
      // ══════════════════════════════════════════════════════════════════
      const { data: openSessions } = await supabase
        .from('visit_logs')
        .select('id, time_in')
        .eq('visitor_id', vid)
        .is('time_out', null)
        .limit(10);

      if (openSessions && openSessions.length > 0) {
        const now = new Date().toISOString();
        
        // Close all open sessions in parallel
        const updatePromises = openSessions.map(s => {
          const dur = calcDurationMinutes(s.time_in, now);
          return supabase.from('visit_logs').update({
            time_out: now,
            duration_minutes: Math.max(0, Math.round(dur)),
          }).eq('id', s.id);
        });

        await Promise.all(updatePromises);
      }

      // ══════════════════════════════════════════════════════════════════
      // STEP 3: Insert exactly ONE time-in record
      // Safe because we just closed all open sessions above
      // ══════════════════════════════════════════════════════════════════
      const now = new Date().toISOString();
      const { error: logErr } = await supabase.from('visit_logs').insert({
        visitor_id: vid,
        purpose,
        time_in:    now,
        visit_date: now.split('T')[0],
      });
      if (logErr) throw logErr;

      // Navigate to success page showing "Welcome to the Library!"
      const timeStr = new Date().toLocaleTimeString('en-PH', { 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });
      
      await signOut();
      navigate(
        `/success?action=in&name=${encodeURIComponent(fullName.trim().split(' ')[0])}&time=${encodeURIComponent(timeStr)}`,
        { replace: true }
      );
    } catch (e: unknown) {
      setError((e as Error)?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 -z-10"
        style={{ backgroundImage:"url('/Neu-Lib_Building.jpg')", backgroundSize:'cover', backgroundPosition:'center' }}
        aria-hidden />
      <div className="fixed inset-0 -z-10"
        style={{ background:'linear-gradient(160deg,rgba(0,20,80,.82) 0%,rgba(0,50,160,.76) 50%,rgba(0,20,80,.86) 100%)' }}
        aria-hidden />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-5">
            <img src="/NEU%20Library%20logo.png" alt="NEU"
              className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-xl"
              onError={e => { const i = e.currentTarget as HTMLImageElement; if (!i.dataset.t) { i.dataset.t='1'; i.src='/neu-logo.svg'; } else i.style.display='none'; }} />
            <h1 className="text-white font-black text-xl" style={{ fontFamily:'Outfit,sans-serif' }}>Welcome to NEU Library!</h1>
            <p className="text-white/55 text-sm mt-0.5">Complete your profile to get started</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2.5" style={{ background:'rgba(239,246,255,.8)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ background:'linear-gradient(135deg,#003087,#0050C8)' }}>
                {(prefillName?.[0] ?? prefillEmail[0] ?? '?').toUpperCase()}
              </div>
              <p className="text-sm font-semibold text-slate-700 truncate">{prefillEmail}</p>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-600 text-xs font-semibold leading-relaxed">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Visitor type */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['student', GraduationCap, 'Student',       'Enrolled student'],
                      ['faculty', Users,          'Faculty / Staff', 'Teacher or staff'],
                    ] as [VisitorType, typeof GraduationCap, string, string][]).map(([vt, Icon, lbl, sub]) => (
                      <button key={vt} type="button"
                        onClick={() => { setVType(vt); setCollegeId(null); setProgramId(null); setDepartment(''); }}
                        className="py-3 px-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all"
                        style={{ borderColor: vType === vt ? '#2563EB' : '#E2E8F0', background: vType === vt ? '#EFF6FF' : '#FAFAFA' }}>
                        <Icon size={20} style={{ color: vType === vt ? '#2563EB' : '#94A3B8' }} />
                        <span className="text-xs font-black" style={{ color: vType === vt ? '#2563EB' : '#475569' }}>{lbl}</span>
                        <span className="text-[9px] font-medium" style={{ color: vType === vt ? '#60A5FA' : '#94A3B8' }}>{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full name */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Full Name</label>
                  <input type="text" className="input" placeholder="Juan dela Cruz"
                    value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>

                {/* College — required for both */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    College <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select className="input appearance-none pr-8 cursor-pointer"
                      value={collegeId ?? ''} required
                      onChange={e => { setCollegeId(e.target.value ? Number(e.target.value) : null); setProgramId(null); }}>
                      <option value="">Select your college</option>
                      {colleges.map(c => <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Course — students only */}
                {isStudent && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Course <span className="text-red-500">*</span>
                      {!collegeId && <span className="text-[9px] text-slate-400 font-normal ml-1">(select college first)</span>}
                    </label>
                    <div className="relative">
                      <select className="input appearance-none pr-8 cursor-pointer disabled:opacity-50"
                        value={programId ?? ''} required disabled={!collegeId}
                        onChange={e => setProgramId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">{!collegeId ? 'Select college first' : 'Select your course'}</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.abbreviation} — {p.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Dept — faculty optional */}
                {!isStudent && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Department / Role <span className="text-[9px] text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input type="text" className="input" placeholder="e.g. Instructor, Department Chair"
                      value={department} onChange={e => setDepartment(e.target.value)} />
                  </div>
                )}

                {/* Purpose */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                    Reason for Visiting Today
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PURPOSES.map(p => (
                      <button key={p} type="button" onClick={() => setPurpose(p)}
                        className="py-3 rounded-xl border-2 flex items-center gap-2 px-3 transition-all"
                        style={{ borderColor: purpose === p ? '#2563EB' : '#E2E8F0', background: purpose === p ? '#EFF6FF' : '#FAFAFA' }}>
                        <span className="text-lg">{PURPOSE_EMOJI[p]}</span>
                        <span className="text-[11px] font-bold" style={{ color: purpose === p ? '#2563EB' : '#64748B' }}>{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit"
                  disabled={loading || !purpose || !collegeId || (isStudent && !programId)}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md mt-1">
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Registering &amp; Recording Time In…</>
                    : 'Complete Registration & Time In →'}
                </button>
              </form>

              <button onClick={() => signOut().then(() => navigate('/', { replace: true }))}
                className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Cancel — use a different account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}