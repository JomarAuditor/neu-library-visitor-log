// src/pages/visitor/RegisterPage.tsx
// FIXES:
// - College is NOW REQUIRED for faculty (not optional anymore)
// - Admin can register as a visitor (no special blocking)
// - Clean UI, no long text overflow
import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, GraduationCap, Users, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase }          from '@/lib/supabase';
import { useAuth }           from '@/hooks/useAuth';
import { useColleges, useAllPrograms } from '@/hooks/useStats';
import { PURPOSES, VisitPurpose, VisitorType, PURPOSE_EMOJI } from '@/types';

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

  // Preloaded at app startup — never shows loading spinner
  const { data: colleges    = [] } = useColleges();
  const { data: allPrograms = [] } = useAllPrograms();

  const programs = collegeId ? allPrograms.filter(p => p.college_id === collegeId) : [];
  const isStudent = vType === 'student';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim())                      { setError('Please enter your full name.'); return; }
    if (!prefillEmail)                         { setError('No email detected. Please sign in again.'); return; }
    // College required for BOTH student and faculty now
    if (!collegeId)                            { setError('Please select your college or department.'); return; }
    if (isStudent && !programId)               { setError('Please select your course.'); return; }
    if (!purpose)                              { setError('Please select your reason for visiting.'); return; }

    setLoading(true);
    try {
      const email = prefillEmail.toLowerCase().trim();

      // Race-condition guard
      const { data: existing } = await supabase
        .from('visitors').select('id').eq('email', email).maybeSingle();
      let vid: string;

      if (existing) {
        vid = existing.id;
      } else {
        const { data: nv, error: ie } = await supabase
          .from('visitors')
          .insert({
            email,
            full_name:    fullName.trim(),
            visitor_type: vType,
            college_id:   collegeId,                         // always set now
            program_id:   isStudent ? programId : null,
            department:   !isStudent && department.trim() ? department.trim() : null,
            is_blocked:   false,
          })
          .select('id').single();

        if (ie) {
          if (ie.code === '23505') {
            const { data: dup } = await supabase.from('visitors').select('id').eq('email', email).single();
            vid = dup!.id;
          } else throw ie;
        } else {
          vid = nv!.id;
        }
      }

      // Time-In immediately
      const now = new Date().toISOString();
      const { error: logError } = await supabase.from('visit_logs').insert({
        visitor_id: vid, purpose, time_in: now, visit_date: now.split('T')[0],
      });

      if (logError) throw logError;

      // Get time string for success page
      const timeStr = new Date().toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      // Sign out and redirect to success page (not home)
      await signOut();
      navigate(
        `/success?action=in&name=${encodeURIComponent(fullName.trim())}&time=${encodeURIComponent(timeStr)}`,
        { replace: true }
      );
    } catch (e: unknown) {
      console.error('Registration error:', e);
      setError((e as Error)?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Fixed background */}
      <div className="fixed inset-0 -z-10"
        style={{ backgroundImage: "url('/Neu-Lib_Building.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
        aria-hidden />
      <div className="fixed inset-0 -z-10"
        style={{ background: 'linear-gradient(160deg,rgba(0,20,80,.82) 0%,rgba(0,50,160,.76) 50%,rgba(0,20,80,.86) 100%)' }}
        aria-hidden />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-5">
            <img src="/NEU%20Library%20logo.png" alt="NEU"
              className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-xl"
              onError={e => { const i = e.currentTarget as HTMLImageElement; if (!i.dataset.t) { i.dataset.t='1'; i.src='/neu-logo.svg'; } else i.style.display='none'; }} />
            <h1 className="text-white font-black text-xl" style={{ fontFamily:'Outfit,sans-serif' }}>
              Welcome to NEU Library!
            </h1>
            <p className="text-white/55 text-sm mt-0.5">Complete your profile to get started</p>
          </div>

          <div className="bg-white/93 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
            {/* Email banner */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2.5"
              style={{ background: 'rgba(239,246,255,.8)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ background: 'linear-gradient(135deg,#003087,#0050C8)' }}>
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
                      ['student', GraduationCap, 'Student',        'Enrolled student'],
                      ['faculty', Users,          'Faculty / Staff', 'Teacher or staff'],
                    ] as [VisitorType, typeof GraduationCap, string, string][]).map(([vt, Icon, lbl, sub]) => (
                      <button key={vt} type="button"
                        onClick={() => { setVType(vt); setCollegeId(null); setProgramId(null); setDepartment(''); }}
                        className="py-3 px-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all"
                        style={{
                          borderColor: vType === vt ? '#2563EB' : '#E2E8F0',
                          background:  vType === vt ? '#EFF6FF' : '#FAFAFA',
                        }}>
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

                {/* College — REQUIRED FOR BOTH student and faculty */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                    College
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <select className="input appearance-none pr-8 cursor-pointer"
                      value={collegeId ?? ''} required
                      onChange={e => { setCollegeId(e.target.value ? Number(e.target.value) : null); setProgramId(null); }}>
                      <option value="">Select your college</option>
                      {colleges.map(c => (
                        <option key={c.id} value={c.id}>{c.abbreviation} — {c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Course — required for students only */}
                {isStudent && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Course
                      {!collegeId && <span className="text-[9px] text-slate-400 font-normal ml-1">(select college first)</span>}
                    </label>
                    <div className="relative">
                      <select className="input appearance-none pr-8 cursor-pointer disabled:opacity-50"
                        value={programId ?? ''} required disabled={!collegeId}
                        onChange={e => setProgramId(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">{!collegeId ? 'Select college first' : 'Select your course'}</option>
                        {programs.map(p => (
                          <option key={p.id} value={p.id}>{p.abbreviation} — {p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Department/Role — optional for faculty */}
                {!isStudent && (
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                      Department / Role
                      <span className="text-[9px] text-slate-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input type="text" className="input"
                      placeholder="e.g. Instructor, Department Chair"
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
                        style={{
                          borderColor: purpose === p ? '#2563EB' : '#E2E8F0',
                          background:  purpose === p ? '#EFF6FF' : '#FAFAFA',
                        }}>
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
                    ? <><Loader2 size={15} className="animate-spin" /> Registering & Recording Time In…</>
                    : 'Complete Registration & Time In →'}
                </button>
              </form>

              <button
                onClick={() => signOut().then(() => navigate('/', { replace: true }))}
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