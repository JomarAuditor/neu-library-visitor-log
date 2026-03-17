// =====================================================================
// NEU Library — Visitor Kiosk (Home)
// File: src/pages/visitor/VisitorHome.tsx
// =====================================================================
// CHANGES:
//   + "Google" tab added (3rd tab alongside QR and Email)
//   + Google sign-in → looks up email in students table
//   + If found → Time In / Time Out flow → "Welcome to NEU Library!"
//   + If not found → prompt to register
//   + Admin users redirected to dashboard
// =====================================================================

import { useState, FormEvent, useEffect } from 'react';
import {
  QrCode, Mail, ScanLine, ChevronRight,
  Loader2, LogIn, LogOut, AlertCircle, ArrowRight, UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { QRScanner } from '@/components/visitor/QRScanner';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI } from '@/types';
import {
  validateNEUEmail, decodeQR, calcDurationMinutes,
  validateStudentNumber, formatStudentNumber, studentNumberHint,
} from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

type Tab  = 'qr' | 'email' | 'google';
type Step = 'login' | 'purpose' | 'confirm-timeout' | 'not-registered';

interface ActiveSession {
  logId:       string;
  studentId:   string;
  studentName: string;
  timeIn:      string;
}

// Inline Google icon
function GoogleIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function VisitorHome() {
  const navigate = useNavigate();
  const { user, isAdmin, signInWithGoogle, signOut, loading, profileReady } = useAuth();

  const [tab,           setTab]           = useState<Tab>('qr');
  const [step,          setStep]          = useState<Step>('login');
  const [pageLoading,   setPageLoading]   = useState(false);
  const [scanning,      setScanning]      = useState(false);
  const [error,         setError]         = useState('');
  const [email,         setEmail]         = useState('');
  const [sn,            setSN]            = useState('');
  const [studentId,     setStudentId]     = useState('');
  const [studentName,   setStudentName]   = useState('');
  const [loginMethod,   setLoginMethod]   = useState<'QR Code' | 'Email'>('QR Code');
  const [purpose,       setPurpose]       = useState<VisitPurpose | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [gBusy,         setGBusy]         = useState(false);

  const snHint = studentNumberHint(sn);

  // ── If Google OAuth just completed and user is admin → push to dashboard
  useEffect(() => {
    if (loading || !profileReady) return;
    if (isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [loading, profileReady, isAdmin, navigate]);

  // ── When user signs in via Google tab → auto-lookup ───────────────
  const handleGoogleLookup = async () => {
    if (!user?.email) return;
    setPageLoading(true);
    setError('');

    try {
      const { data, error: e } = await supabase
        .from('students')
        .select('id, name, is_blocked')
        .eq('email', user.email.toLowerCase())
        .maybeSingle();

      if (e) throw e;

      if (!data) {
        // Not registered → show prompt
        setStep('not-registered');
        setPageLoading(false);
        return;
      }

      if (data.is_blocked) {
        setError('Your library access is restricted. Please contact the librarian.');
        setPageLoading(false);
        return;
      }

      await processStudent(data.id, data.name, 'Email');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPageLoading(false);
    }
  };

  // ── Shared: look up student by email + student number ─────────────
  const lookupStudent = async (emailVal: string, snVal: string) => {
    try {
      const { data, error: e } = await supabase
        .from('students')
        .select('id, name, is_blocked')
        .eq('email', emailVal.toLowerCase().trim())
        .eq('student_number', snVal.trim())
        .single();

      if (e || !data) return { error: 'Student not found. Check credentials or register first.' };
      if (data.is_blocked) return { error: 'Your library access is restricted. Contact the librarian.' };
      return { student: data };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  };

  // ── Check for open session ────────────────────────────────────────
  const checkActiveSession = async (sid: string) => {
    try {
      const { data } = await supabase
        .from('visitor_logs')
        .select('id, time_in')
        .eq('student_id', sid)
        .is('time_out', null)
        .order('time_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string; time_in: string } | null;
    } catch { return null; }
  };

  const processStudent = async (sid: string, name: string, method: 'QR Code' | 'Email') => {
    setStudentId(sid);
    setStudentName(name);
    setLoginMethod(method);
    const open = await checkActiveSession(sid);
    if (open) {
      setActiveSession({ logId: open.id, studentId: sid, studentName: name, timeIn: open.time_in });
      setStep('confirm-timeout');
    } else {
      setStep('purpose');
    }
  };

  // ── QR scan handler ───────────────────────────────────────────────
  const handleQR = async (raw: string) => {
    setError(''); setPageLoading(true); setScanning(false);
    const decoded = decodeQR(raw);
    if (!decoded) { setError('Invalid QR code. Please register first.'); setPageLoading(false); return; }
    const res = await lookupStudent(decoded.email, decoded.studentNumber);
    setPageLoading(false);
    if ('error' in res) { setError(res.error); return; }
    await processStudent(res.student.id, res.student.name, 'QR Code');
  };

  // ── Email login handler ───────────────────────────────────────────
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!validateNEUEmail(email))   { setError('Use your @neu.edu.ph email.'); return; }
    if (!validateStudentNumber(sn)) { setError('Invalid format. Must be: YY-NNNNN-NNN'); return; }
    setPageLoading(true);
    const res = await lookupStudent(email, sn);
    setPageLoading(false);
    if ('error' in res) { setError(res.error); return; }
    await processStudent(res.student.id, res.student.name, 'Email');
  };

  // ── Time In ───────────────────────────────────────────────────────
  const handleTimeIn = async () => {
    if (!purpose) return;
    setPageLoading(true); setError('');
    try {
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('visitor_logs').insert({
        student_id: studentId, purpose, login_method: loginMethod,
        time_in: now, time_out: null, duration_minutes: null,
        date: now.split('T')[0],
      });
      if (e) throw e;
      navigate('/welcome?action=in&name=' + encodeURIComponent(studentName));
    } catch { setError('Failed to log entry. Please try again.'); }
    finally { setPageLoading(false); }
  };

  // ── Time Out ──────────────────────────────────────────────────────
  const handleTimeOut = async () => {
    if (!activeSession) return;
    setPageLoading(true); setError('');
    try {
      const now = new Date().toISOString();
      const dur = calcDurationMinutes(activeSession.timeIn, now);
      const { error: e } = await supabase
        .from('visitor_logs')
        .update({ time_out: now, duration_minutes: dur })
        .eq('id', activeSession.logId);
      if (e) throw e;
      navigate('/welcome?action=out&name=' + encodeURIComponent(activeSession.studentName) + '&dur=' + dur);
    } catch { setError('Failed to record time out. Please try again.'); }
    finally { setPageLoading(false); }
  };

  const reset = () => {
    setStep('login'); setError(''); setScanning(false); setPageLoading(false);
    setStudentId(''); setStudentName(''); setPurpose(null);
    setActiveSession(null); setEmail(''); setSN('');
    if (tab === 'google') signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/NEU%20Library%20logo.png"
              alt="NEU Library"
              className="h-10 w-auto object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div>
              <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">
                New Era University
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Library Visitor Log System</p>
            </div>
          </div>
          <a
            href="/admin/login"
            className="text-xs text-slate-400 hover:text-neu-blue flex items-center gap-1 transition-colors"
          >
            Admin <ArrowRight size={12} />
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-start lg:items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── LOGIN STEP ── */}
          {step === 'login' && (
            <div className="animate-scale-in">
              {/* Logo + title */}
              <div className="text-center mb-6">
                <img
                  src="/NEU%20Library%20logo.png"
                  alt="NEU Library"
                  className="h-24 w-auto object-contain mx-auto mb-4 drop-shadow-md"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  Welcome to NEU Library
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Sign in to record your library visit
                </p>
              </div>

              {/* ── Tabs: QR | Email | Google ── */}
              <div className="flex bg-neu-gray rounded-2xl p-1.5 mb-4 border border-neu-border gap-1">
                {([
                  ['qr',     'QR Code'],
                  ['email',  'Email'],
                  ['google', 'Google'],
                ] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => { setTab(v); setError(''); setScanning(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      tab === v
                        ? 'bg-white text-neu-blue shadow-card'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
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

                {/* ── QR Tab ── */}
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
                        onError={(e) => { setError(e); setScanning(false); }} />
                      {pageLoading && (
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

                {/* ── Email Tab ── */}
                {tab === 'email' && (
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="label">NEU Email Address</label>
                      <input type="email" className="input" placeholder="yourname@neu.edu.ph"
                        value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                      <p className="text-[11px] text-slate-400 mt-1">Must end with @neu.edu.ph</p>
                    </div>
                    <div>
                      <label className="label">Student Number</label>
                      <input
                        type="text"
                        className={`input font-mono tracking-wider ${sn && snHint ? 'border-amber-300' : ''} ${sn && !snHint ? 'border-green-300' : ''}`}
                        placeholder="24-13005-502"
                        value={sn} onChange={e => setSN(formatStudentNumber(e.target.value))}
                        maxLength={12} required
                      />
                      {sn && snHint  && <p className="text-[11px] text-amber-600 mt-1 font-medium">{snHint}</p>}
                      {sn && !snHint && <p className="text-[11px] text-green-600 mt-1 font-medium">Valid format</p>}
                    </div>
                    <button type="submit" className="btn-primary w-full py-3.5" disabled={pageLoading}>
                      {pageLoading ? <><Loader2 size={16} className="animate-spin" />Verifying…</> : <><ChevronRight size={17} />Continue</>}
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Not registered?{' '}
                      <a href="/register" className="text-neu-blue font-semibold hover:underline">Get your QR code</a>
                    </p>
                  </form>
                )}

                {/* ── Google Tab ── */}
                {tab === 'google' && (
                  <div className="text-center space-y-4">
                    {user ? (
                      // Already signed in via Google
                      <div>
                        <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-3">
                          <GoogleIcon size={28} />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{user.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5 mb-4">Signed in with Google</p>
                        <button
                          onClick={handleGoogleLookup}
                          disabled={pageLoading}
                          className="btn-primary w-full py-3.5"
                        >
                          {pageLoading
                            ? <><Loader2 size={16} className="animate-spin" />Looking up your record…</>
                            : <><LogIn size={17} />Continue to Library</>}
                        </button>
                        <button
                          onClick={() => signOut()}
                          className="w-full mt-2 text-xs text-slate-400 hover:text-red-500 transition-colors py-2"
                        >
                          Sign out
                        </button>
                      </div>
                    ) : (
                      // Not signed in
                      <div>
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                          <GoogleIcon size={28} />
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                          Sign in with your NEU Google account to record your library visit.
                        </p>
                        <button
                          onClick={async () => {
                            setGBusy(true);
                            const { error: err } = await signInWithGoogle('/');
                            if (err) { setError(err); setGBusy(false); }
                          }}
                          disabled={gBusy}
                          className="w-full py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60 shadow-sm"
                        >
                          {gBusy ? <Loader2 size={17} className="animate-spin text-neu-blue" /> : <GoogleIcon size={18} />}
                          {gBusy ? 'Redirecting to Google…' : 'Sign in with Google'}
                        </button>
                        <p className="text-[11px] text-slate-400 mt-3">
                          Use your <strong>@neu.edu.ph</strong> Google Workspace account
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── NOT REGISTERED STEP ── */}
          {step === 'not-registered' && (
            <div className="animate-scale-in card-p text-center">
              <div className="w-14 h-14 rounded-2xl bg-neu-light flex items-center justify-center mx-auto mb-4">
                <UserPlus size={24} className="text-neu-blue" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome to NEU Library!</h2>
              <p className="text-sm text-slate-500 mb-2">
                Hi, <span className="font-semibold text-slate-700">{user?.user_metadata?.full_name ?? user?.email}</span>!
              </p>
              <p className="text-sm text-slate-500 mb-5">
                Your Google account isn't registered yet. Please register to get your library QR code.
              </p>
              <a href="/register" className="btn-primary w-full py-3.5 block text-center mb-3">
                <UserPlus size={17} />Register for Library Access
              </a>
              <button onClick={reset} className="btn-secondary w-full text-sm">
                Cancel
              </button>
            </div>
          )}

          {/* ── PURPOSE (Time In) STEP ── */}
          {step === 'purpose' && (
            <div className="animate-scale-in">
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <LogIn size={22} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Identity Verified!</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Hello, <span className="font-semibold text-slate-700">{studentName}</span>!
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
                    }`}
                  >
                    <span className="text-3xl">{PURPOSE_EMOJI[p]}</span>
                    <span className={`text-sm font-semibold ${purpose === p ? 'text-neu-blue' : 'text-slate-700'}`}>{p}</span>
                  </button>
                ))}
              </div>
              <button onClick={handleTimeIn} disabled={!purpose || pageLoading} className="btn-primary w-full py-3.5 text-base">
                {pageLoading ? <><Loader2 size={17} className="animate-spin" />Logging entry…</> : <><LogIn size={18} />Confirm Time In</>}
              </button>
              <button onClick={reset} className="btn-secondary w-full mt-3 text-sm">Go Back</button>
            </div>
          )}

          {/* ── CONFIRM TIME OUT STEP ── */}
          {step === 'confirm-timeout' && activeSession && (
            <div className="animate-scale-in">
              <div className="card-p text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <LogOut size={26} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Time Out?</h2>
                <p className="text-sm text-slate-500 mb-5">
                  Hi, <span className="font-semibold text-slate-700">{activeSession.studentName}</span>
                </p>
                <div className="flex items-center justify-center gap-3 mb-5">
                  <div className="bg-neu-light rounded-xl px-4 py-2.5 border border-neu-border">
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Checked In</p>
                    <p className="text-sm font-bold text-neu-blue">
                      {new Date(activeSession.timeIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                  <div className="text-slate-300 text-xl">→</div>
                  <div className="bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-medium mb-0.5 uppercase tracking-wide">Time Out</p>
                    <p className="text-sm font-bold text-amber-700">
                      {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>
                </div>
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>
                )}
                <button onClick={handleTimeOut} disabled={pageLoading}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 transition-all mb-3 disabled:opacity-60">
                  {pageLoading ? <><Loader2 size={17} className="animate-spin" />Recording…</> : <><LogOut size={18} />Confirm Time Out</>}
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