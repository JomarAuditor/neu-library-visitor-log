// src/pages/visitor/VisitorHome.tsx
// KEY BEHAVIOURS:
//   1. Admin accounts CAN sign in as visitors on this page (no auto-redirect to dashboard)
//   2. Google sign-in → if no record → choose type (Student/Faculty/Staff)
//   3. First visit of the day = Time In. If already checked in = Time Out.
//   4. Email login and Google login share the same visitor record (same email = same person)
//   5. Faculty/Staff: no employee ID needed, only email
//   6. If unregistered → redirect to /register

import { useState, FormEvent, useEffect, useRef } from 'react';
import {
  QrCode, Mail, ScanLine, ChevronRight, Loader2,
  LogIn, LogOut, AlertCircle, ArrowRight, UserPlus,
  GraduationCap, Users, Briefcase,
} from 'lucide-react';
import { useNavigate }      from 'react-router-dom';
import { supabase }         from '@/lib/supabase';
import { QRScanner }        from '@/components/visitor/QRScanner';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI, VisitorType } from '@/types';
import {
  validateNEUEmail, decodeQR, calcDurationMinutes,
  validateStudentNumber, formatStudentNumber, studentNumberHint,
} from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

type Tab  = 'qr' | 'email' | 'google';
type Step = 'login' | 'purpose' | 'confirm-timeout' | 'choose-type';

interface ActiveSession {
  logId:       string;
  visitorId:   string;
  visitorName: string;
  timeIn:      string;
}

function GoogleIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <img src="/NEU%20Library%20logo.png" alt="NEU Library" className={className}
      onError={e => { const el = e.currentTarget as HTMLImageElement; el.onerror = null; el.src = '/neu-logo.svg'; }} />
  );
}

export default function VisitorHome() {
  const navigate = useNavigate();
  // NOTE: We do NOT auto-redirect admins here.
  // Admins can choose to use the visitor portal like any other visitor.
  const { user, signInWithGoogle, signOut } = useAuth();

  const [tab,         setTab]         = useState<Tab>('qr');
  const [step,        setStep]        = useState<Step>('login');
  const [busy,        setBusy]        = useState(false);
  const [scanning,    setScanning]    = useState(false);
  const [error,       setError]       = useState('');
  const [email,       setEmail]       = useState('');
  const [sn,          setSN]          = useState('');
  const [visitorId,   setVisitorId]   = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [method,      setMethod]      = useState<'QR Code'|'Email'|'Google'>('QR Code');
  const [purpose,     setPurpose]     = useState<VisitPurpose | null>(null);
  const [session,     setSession]     = useState<ActiveSession | null>(null);
  const [gBusy,       setGBusy]       = useState(false);
  const snHint     = studentNumberHint(sn);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  // ── Core helpers ─────────────────────────────────────────────────
  const checkOpenSession = async (vid: string) => {
    const { data } = await supabase
      .from('visit_logs')
      .select('id, time_in')
      .eq('visitor_id', vid)
      .is('time_out', null)
      .order('time_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as { id: string; time_in: string } | null;
  };

  const proceed = async (vid: string, name: string, m: typeof method) => {
    setVisitorId(vid); setVisitorName(name); setMethod(m);
    const open = await checkOpenSession(vid);
    if (open) {
      setSession({ logId: open.id, visitorId: vid, visitorName: name, timeIn: open.time_in });
      setStep('confirm-timeout');
    } else {
      setStep('purpose');
    }
  };

  // ── QR scan ───────────────────────────────────────────────────────
  const handleQR = async (raw: string) => {
    setError(''); setBusy(true); setScanning(false);
    const decoded = decodeQR(raw);
    if (!decoded) { setError('Invalid QR code. Please register first.'); setBusy(false); return; }
    const { data, error: e } = await supabase.from('visitors')
      .select('id, full_name, is_blocked')
      .eq('email', decoded.email)
      .eq('student_number', decoded.studentNumber)
      .single();
    setBusy(false);
    if (e || !data) { setError('Student not found. Please register first.'); return; }
    if (data.is_blocked) { setError('Your library access is restricted. Contact the librarian.'); return; }
    await proceed(data.id, data.full_name, 'QR Code');
  };

  // ── Email login ───────────────────────────────────────────────────
  // Students: email + student number
  // Faculty/Staff: email only (student_number field will be empty)
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!validateNEUEmail(email)) { setError('Use your @neu.edu.ph email address.'); return; }
    setBusy(true);

    // Try to find visitor by email first (works for faculty/staff)
    let q = supabase.from('visitors').select('id, full_name, is_blocked, visitor_type, student_number')
      .eq('email', email.toLowerCase().trim());

    // If student number provided, add it as a filter
    if (sn.trim()) q = q.eq('student_number', sn.trim());

    const { data, error: err } = await q.maybeSingle();
    setBusy(false);

    if (!data) {
      if (sn.trim()) {
        setError('Student not found. Check your credentials or register first.');
      } else {
        setError('Account not found. Please register first at /register.');
      }
      return;
    }
    if (data.is_blocked) { setError('Your library access is restricted.'); return; }
    await proceed(data.id, data.full_name, 'Email');
  };

  // ── Google lookup (8-second timeout) ─────────────────────────────
  const handleGoogleLookup = async () => {
    if (!user?.email) return;
    setBusy(true); setError('');

    timeoutRef.current = setTimeout(() => {
      setBusy(false);
      setError('Request timed out. Please try Email login instead.');
    }, 8000);

    try {
      const { data } = await supabase.from('visitors')
        .select('id, full_name, is_blocked')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }

      if (!data) {
        // Not in visitors table → ask them to choose type or go to register
        setStep('choose-type');
        setBusy(false);
        return;
      }
      if (data.is_blocked) { setError('Your library access is restricted.'); setBusy(false); return; }
      await proceed(data.id, data.full_name, 'Google');
    } catch {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setError('Network error. Please try again.');
      setBusy(false);
    }
  };

  // ── Auto-register Faculty/Staff via Google ────────────────────────
  // Students MUST go to the register page (they need student number + college)
  const handleAutoRegister = async (type: 'faculty' | 'staff') => {
    if (!user?.email) return;
    setBusy(true); setError('');
    try {
      const fullName = user.user_metadata?.full_name
        ?? user.user_metadata?.name
        ?? user.email.split('@')[0];

      // Check again (race condition guard)
      const { data: exists } = await supabase.from('visitors')
        .select('id, full_name').eq('email', user.email.toLowerCase()).maybeSingle();

      if (exists) {
        await proceed(exists.id, exists.full_name, 'Google');
        return;
      }

      const { data, error: e } = await supabase.from('visitors')
        .insert({
          email:          user.email.toLowerCase(),
          full_name:      fullName,
          visitor_type:   type,
          student_number: null,
          program_id:     null,
          college_id:     null,
          is_blocked:     false,
        })
        .select('id, full_name').single();

      if (e) { setError('Registration failed: ' + e.message); return; }
      await proceed(data.id, data.full_name, 'Google');
    } catch { setError('Network error. Please try again.'); }
    finally { setBusy(false); }
  };

  // ── Time In ───────────────────────────────────────────────────────
  const handleTimeIn = async () => {
    if (!purpose) return;
    setBusy(true); setError('');
    try {
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('visit_logs').insert({
        visitor_id:  visitorId,
        purpose,
        login_method: method,
        time_in:     now,
        visit_date:  now.split('T')[0],
      });
      if (e) throw e;
      navigate('/welcome?action=in&name=' + encodeURIComponent(visitorName));
    } catch { setError('Failed to log entry. Please try again.'); }
    finally { setBusy(false); }
  };

  // ── Time Out ──────────────────────────────────────────────────────
  const handleTimeOut = async () => {
    if (!session) return;
    setBusy(true); setError('');
    try {
      const now = new Date().toISOString();
      const dur = calcDurationMinutes(session.timeIn, now);
      const { error: e } = await supabase.from('visit_logs')
        .update({ time_out: now, duration_minutes: dur })
        .eq('id', session.logId);
      if (e) throw e;
      navigate(`/welcome?action=out&name=${encodeURIComponent(session.visitorName)}&dur=${dur}`);
    } catch { setError('Failed to record time out. Please try again.'); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setStep('login'); setError(''); setScanning(false); setBusy(false);
    setVisitorId(''); setVisitorName(''); setPurpose(null); setSession(null);
    setEmail(''); setSN('');
    if (tab === 'google') signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-auto object-contain" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">
                New Era University
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Library Visitor Log System</p>
            </div>
          </div>
          <a href="/admin/login"
            className="text-xs text-slate-400 hover:text-neu-blue flex items-center gap-1 transition-colors font-medium">
            Admin <ArrowRight size={12} />
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-start lg:items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── LOGIN STEP ── */}
          {step === 'login' && (
            <div className="animate-scale-in">
              <div className="text-center mb-6">
                <Logo className="h-24 w-auto object-contain mx-auto mb-4 drop-shadow-md" />
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Welcome to NEU Library</h1>
                <p className="text-sm text-slate-500 mt-1">Sign in to record your library visit</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-neu-gray rounded-2xl p-1.5 mb-4 border border-neu-border gap-1">
                {([
                  ['qr',     'QR Code'],
                  ['email',  'Email'],
                  ['google', 'Google'],
                ] as const).map(([v, label]) => (
                  <button key={v}
                    onClick={() => { setTab(v); setError(''); setScanning(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      tab === v ? 'bg-white text-neu-blue shadow-card' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {v === 'qr'     && <QrCode  size={13} />}
                    {v === 'email'  && <Mail     size={13} />}
                    {v === 'google' && <GoogleIcon size={13} />}
                    {label}
                  </button>
                ))}
              </div>

              <div className="card-p">
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                {/* QR Tab */}
                {tab === 'qr' && (
                  !scanning ? (
                    <div className="text-center">
                      <div className="w-40 h-40 rounded-2xl bg-neu-light border-2 border-dashed border-neu-blue/25 flex flex-col items-center justify-center mx-auto mb-5">
                        <QrCode size={48} className="text-neu-blue/35 mb-2" strokeWidth={1.5} />
                        <p className="text-xs text-slate-400 font-medium">Camera off</p>
                      </div>
                      <button onClick={() => { setScanning(true); setError(''); }} className="btn-primary w-full py-3.5">
                        <ScanLine size={17} />Start QR Scanner
                      </button>
                      <p className="text-xs text-slate-400 mt-4">
                        No QR code?{' '}
                        <a href="/register" className="text-neu-blue font-semibold hover:underline">Register here</a>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-sm font-semibold text-slate-700">Scanning… point camera at QR code</p>
                      </div>
                      <QRScanner active={scanning} onResult={handleQR}
                        onError={e => { setError(e); setScanning(false); }} />
                      {busy && (
                        <div className="flex items-center justify-center gap-2 text-sm text-neu-blue mt-3">
                          <Loader2 size={15} className="animate-spin" />Verifying…
                        </div>
                      )}
                      <button onClick={() => setScanning(false)} className="btn-secondary w-full mt-3 text-sm py-2.5">
                        Cancel Scanner
                      </button>
                    </div>
                  )
                )}

                {/* Email Tab */}
                {tab === 'email' && (
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="label">NEU Email Address</label>
                      <input type="email" className="input" placeholder="yourname@neu.edu.ph"
                        value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Faculty and staff: email is enough. Students: also enter student number below.
                      </p>
                    </div>
                    <div>
                      <label className="label">
                        Student Number <span className="text-[10px] text-slate-400 font-normal">(students only)</span>
                      </label>
                      <input type="text"
                        className={`input font-mono tracking-wider ${sn && snHint ? 'border-amber-300' : ''} ${sn && !snHint ? 'border-green-300' : ''}`}
                        placeholder="24-13005-502 (leave blank if faculty/staff)"
                        value={sn}
                        onChange={e => setSN(formatStudentNumber(e.target.value))}
                        maxLength={12}
                      />
                      {sn && snHint  && <p className="text-[11px] text-amber-600 mt-1">{snHint}</p>}
                      {sn && !snHint && <p className="text-[11px] text-green-600 mt-1">Valid format</p>}
                    </div>
                    <button type="submit" className="btn-primary w-full py-3.5" disabled={busy}>
                      {busy
                        ? <><Loader2 size={16} className="animate-spin" />Verifying…</>
                        : <><ChevronRight size={17} />Continue</>}
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Not registered?{' '}
                      <a href="/register" className="text-neu-blue font-semibold hover:underline">Get your QR code</a>
                    </p>
                  </form>
                )}

                {/* Google Tab */}
                {tab === 'google' && (
                  <div className="text-center">
                    {user ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-3">
                          <GoogleIcon size={28} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{user.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5 mb-4">Signed in with Google</p>
                        <button onClick={handleGoogleLookup} disabled={busy} className="btn-primary w-full py-3.5 mb-2">
                          {busy
                            ? <><Loader2 size={16} className="animate-spin" />Looking up your record…</>
                            : <><LogIn size={17} />Continue to Library</>}
                        </button>
                        <button onClick={() => signOut()}
                          className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors py-2">
                          Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                          <GoogleIcon size={28} />
                        </div>
                        <p className="text-sm text-slate-700 font-medium mb-1">Sign in with your NEU Google account</p>
                        <p className="text-xs text-slate-400 mb-4">
                          For students, faculty, and staff. If this is your first time, you'll be asked to complete your profile.
                        </p>
                        <button
                          onClick={async () => {
                            setGBusy(true);
                            const { error: e } = await signInWithGoogle('/');
                            if (e) { setError(e); setGBusy(false); }
                          }}
                          disabled={gBusy}
                          className="w-full py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60 shadow-sm">
                          {gBusy
                            ? <Loader2 size={17} className="animate-spin text-neu-blue" />
                            : <GoogleIcon size={18} />}
                          {gBusy ? 'Redirecting to Google…' : 'Sign in with Google'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CHOOSE TYPE (unregistered Google user) ── */}
          {step === 'choose-type' && (
            <div className="animate-scale-in card-p">
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-neu-light flex items-center justify-center mx-auto mb-4">
                  <UserPlus size={24} className="text-neu-blue" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome to NEU Library!</h2>
                <p className="text-sm text-slate-500 mb-1">
                  Hi, <span className="font-semibold text-slate-700">
                    {user?.user_metadata?.full_name ?? user?.email}
                  </span>!
                </p>
                <p className="text-sm text-slate-500">Please tell us who you are so we can register you:</p>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-4">
                {/* Student → go to register page (needs student number + college) */}
                <a href={`/register?email=${encodeURIComponent(user?.email ?? '')}&type=student`}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-neu-blue hover:bg-neu-light transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-neu-light group-hover:bg-neu-blue flex items-center justify-center shrink-0 transition-all">
                    <GraduationCap size={20} className="text-neu-blue group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Student</p>
                    <p className="text-xs text-slate-400">Requires student number and college</p>
                  </div>
                </a>

                {/* Faculty → auto-register, no employee ID needed */}
                <button onClick={() => handleAutoRegister('faculty')} disabled={busy}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-neu-blue hover:bg-neu-light transition-all group text-left disabled:opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-neu-light group-hover:bg-neu-blue flex items-center justify-center shrink-0 transition-all">
                    <Users size={20} className="text-neu-blue group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Faculty / Teacher</p>
                    <p className="text-xs text-slate-400">Professor, instructor — no employee ID needed</p>
                  </div>
                  {busy && <Loader2 size={16} className="animate-spin text-neu-blue ml-auto" />}
                </button>

                {/* Staff → auto-register, no employee ID needed */}
                <button onClick={() => handleAutoRegister('staff')} disabled={busy}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-neu-blue hover:bg-neu-light transition-all group text-left disabled:opacity-60">
                  <div className="w-10 h-10 rounded-xl bg-neu-light group-hover:bg-neu-blue flex items-center justify-center shrink-0 transition-all">
                    <Briefcase size={20} className="text-neu-blue group-hover:text-white transition-all" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Staff / Personnel</p>
                    <p className="text-xs text-slate-400">Non-teaching employee — no employee ID needed</p>
                  </div>
                  {busy && <Loader2 size={16} className="animate-spin text-neu-blue ml-auto" />}
                </button>
              </div>

              {error && (
                <div className="mb-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <button onClick={reset} className="btn-secondary w-full text-sm">Cancel</button>
            </div>
          )}

          {/* ── PURPOSE (Time In) ── */}
          {step === 'purpose' && (
            <div className="animate-scale-in">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <LogIn size={22} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Identity Verified!</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Hello, <span className="font-semibold text-slate-700">{visitorName}</span>!
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-green-50 border border-green-100">
                  <LogIn size={12} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-700">Recording Time In</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                </div>
              )}

              <p className="text-sm font-semibold text-slate-700 mb-3 text-center">What will you do today?</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {PURPOSES.map(p => (
                  <button key={p} onClick={() => setPurpose(p)}
                    className={`card-p cursor-pointer flex flex-col items-center gap-2 py-5 transition-all duration-200 ${
                      purpose === p
                        ? 'border-neu-blue bg-neu-light ring-2 ring-neu-blue/20 shadow-card-md'
                        : 'hover:border-neu-blue/25'
                    }`}>
                    <span className="text-3xl">{PURPOSE_EMOJI[p]}</span>
                    <span className={`text-sm font-semibold ${purpose === p ? 'text-neu-blue' : 'text-slate-700'}`}>
                      {p}
                    </span>
                  </button>
                ))}
              </div>

              <button onClick={handleTimeIn} disabled={!purpose || busy} className="btn-primary w-full py-3.5 text-base">
                {busy
                  ? <><Loader2 size={17} className="animate-spin" />Logging entry…</>
                  : <><LogIn size={18} />Confirm Time In</>}
              </button>
              <button onClick={reset} className="btn-secondary w-full mt-3 text-sm">Go Back</button>
            </div>
          )}

          {/* ── CONFIRM TIME OUT ── */}
          {step === 'confirm-timeout' && session && (
            <div className="animate-scale-in">
              <div className="card-p text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <LogOut size={26} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Time Out?</h2>
                <p className="text-sm text-slate-500 mb-5">
                  Hi, <span className="font-semibold text-slate-700">{session.visitorName}</span>
                </p>
                <div className="flex items-center justify-center gap-3 mb-5">
                  <div className="bg-neu-light rounded-xl px-4 py-2.5 border border-neu-border">
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Checked In</p>
                    <p className="text-sm font-bold text-neu-blue">
                      {new Date(session.timeIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <div className="text-slate-300 text-xl">→</div>
                  <div className="bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-medium mb-0.5 uppercase tracking-wide">Now</p>
                    <p className="text-sm font-bold text-amber-700">
                      {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}
                <button onClick={handleTimeOut} disabled={busy}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 transition-all mb-3 disabled:opacity-60">
                  {busy
                    ? <><Loader2 size={17} className="animate-spin" />Recording…</>
                    : <><LogOut size={18} />Confirm Time Out</>}
                </button>
                <button onClick={reset} className="btn-secondary w-full text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-300">
        &copy; {new Date().getFullYear()} New Era University &middot; Library Visitor Log System
      </footer>
    </div>
  );
}