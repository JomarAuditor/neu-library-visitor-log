import { useState, FormEvent, useEffect } from 'react';
import {
  QrCode, Mail, ScanLine, ChevronRight,
  Loader2, ArrowRight, LogIn, LogOut,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { NEULogo } from '@/components/NEULogo';
import { QRScanner } from '@/components/visitor/QRScanner';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI } from '@/types';
import { validateNEUEmail, decodeQR, calcDurationMinutes, formatStudentNumberInput, validateStudentNumber } from '@/lib/utils';

type Tab  = 'qr' | 'email';
type Step = 'login' | 'purpose' | 'confirm-timeout';

interface ActiveSession { logId: string; studentId: string; studentName: string; timeIn: string; }

export default function VisitorHome() {
  const navigate = useNavigate();

  const [tab,     setTab]     = useState<Tab>('qr');
  const [step,    setStep]    = useState<Step>('login');
  const [loading, setLoading] = useState(false);
  const [scanning,setScanning]= useState(false);
  const [error,   setError]   = useState('');

  // Email fields
  const [email,  setEmail]  = useState('');
  const [sn,     setSN]     = useState('');

  // Identified state
  const [studentId,   setStudentId]   = useState('');
  const [studentName, setStudentName] = useState('');
  const [loginMethod, setLoginMethod] = useState<'QR Code' | 'Email'>('QR Code');
  const [purpose,     setPurpose]     = useState<VisitPurpose | null>(null);

  // Time-out scenario
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // ── Helper: look up student ──────────────────────────────────────────────
  const lookupStudent = async (emailVal: string, snVal: string) => {
    const { data: stu, error: e } = await supabase
      .from('students')
      .select('id, name, is_blocked')
      .eq('email', emailVal.toLowerCase().trim())
      .eq('student_number', snVal.trim())
      .single();
    if (e || !stu) return { error: 'Student not found. Check your credentials or register first.' };
    if (stu.is_blocked) return { error: 'Your library access is restricted. Contact the librarian.' };
    return { student: stu };
  };

  // ── Helper: check for open session (time_out IS NULL) ───────────────────
  const checkActiveSession = async (sid: string) => {
    const { data } = await supabase
      .from('visitor_logs')
      .select('id, time_in')
      .eq('student_id', sid)
      .is('time_out', null)
      .order('time_in', { ascending: false })
      .limit(1)
      .single();
    return data as { id: string; time_in: string } | null;
  };

  // ── After identifying the student ────────────────────────────────────────
  const processStudent = async (sid: string, name: string, method: 'QR Code' | 'Email') => {
    setStudentId(sid); setStudentName(name); setLoginMethod(method);
    const open = await checkActiveSession(sid);

    if (open) {
      // Student already has an open visit — show TIME OUT confirmation
      setActiveSession({ logId: open.id, studentId: sid, studentName: name, timeIn: open.time_in });
      setStep('confirm-timeout');
    } else {
      // No open visit — ask for purpose, then TIME IN
      setStep('purpose');
    }
  };

  // ── QR handler ───────────────────────────────────────────────────────────
  const handleQR = async (raw: string) => {
    setError(''); setLoading(true); setScanning(false);
    const decoded = decodeQR(raw);
    if (!decoded) { setError('Invalid QR code. Please register first.'); setLoading(false); return; }
    const res = await lookupStudent(decoded.email, decoded.studentNumber);
    setLoading(false);
    if ('error' in res) { setError(res.error); return; }
    await processStudent(res.student.id, res.student.name, 'QR Code');
  };

  // If a raw QR payload is provided via URL (e.g. from tapping a generated QR on this device), process it
  const [params] = useSearchParams();
  useEffect(() => {
    const raw = params.get('raw');
    if (raw) {
      // Attempt to process and then clear the param by navigating to root
      (async () => { await handleQR(raw); navigate('/', { replace: true }); })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Email login handler ──────────────────────────────────────────────────
  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!validateNEUEmail(email)) { setError('Please use your official @neu.edu.ph email.'); return; }
    if (!sn.trim()) { setError('Student number is required.'); return; }
    if (!validateStudentNumber(sn)) { setError('Student number must be in the format XX-XXXXX-XXX (e.g. 24-13005-502).'); return; }
    setLoading(true);
    const res = await lookupStudent(email, sn);
    setLoading(false);
    if ('error' in res) { setError(res.error); return; }
    await processStudent(res.student.id, res.student.name, 'Email');
  };

  // ── Confirm TIME IN ──────────────────────────────────────────────────────
  const handleTimeIn = async () => {
    if (!purpose) return;
    setLoading(true); setError('');
    const now = new Date().toISOString();
    const { error: e } = await supabase.from('visitor_logs').insert({
      student_id:   studentId,
      purpose,
      login_method: loginMethod,
      time_in:      now,
      time_out:     null,
      duration_minutes: null,
      date:         now.split('T')[0],
    });
    setLoading(false);
    if (e) { setError('Failed to log entry. Try again.'); return; }
    navigate('/welcome?action=in&name=' + encodeURIComponent(studentName));
  };

  // ── Confirm TIME OUT ─────────────────────────────────────────────────────
  const handleTimeOut = async () => {
    if (!activeSession) return;
    setLoading(true); setError('');
    const now = new Date().toISOString();
    const dur = calcDurationMinutes(activeSession.timeIn, now);
    const { error: e } = await supabase.from('visitor_logs')
      .update({ time_out: now, duration_minutes: dur })
      .eq('id', activeSession.logId);
    setLoading(false);
    if (e) { setError('Failed to record time out. Try again.'); return; }
    navigate('/welcome?action=out&name=' + encodeURIComponent(activeSession.studentName) + '&dur=' + dur);
  };

  const reset = () => {
    setStep('login'); setError(''); setScanning(false); setLoading(false);
    setStudentId(''); setStudentName(''); setPurpose(null); setActiveSession(null);
    setEmail(''); setSN('');
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NEULogo size={40} />
            <div>
              <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase">New Era University</p>
              <p className="text-[10px] text-slate-400 hidden sm:block">Library Visitor Log System</p>
            </div>
          </div>
          <a href="/admin/login" className="text-xs text-slate-400 hover:text-neu-blue flex items-center gap-1 transition-colors">
            Admin <ArrowRight size={12} />
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">

          {/* ── STEP: LOGIN ── */}
          {step === 'login' && (
            <div className="animate-scale-in">
              <div className="text-center mb-7">
                <NEULogo size={64} className="mx-auto mb-4 drop-shadow-md" />
                <h1 className="text-2xl font-bold text-slate-900">Welcome to NEU Library</h1>
                <p className="text-sm text-slate-500 mt-1">Sign in to record your visit</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-neu-gray rounded-2xl p-1.5 mb-5 border border-neu-border">
                {([['qr', QrCode, 'Scan QR Code'], ['email', Mail, 'Email Login']] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => { setTab(v as Tab); setError(''); setScanning(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      tab === v ? 'bg-white text-neu-blue shadow-card' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    <Icon size={15} />{label}
                  </button>
                ))}
              </div>

              <div className="card-p">
                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}

                {/* QR tab */}
                {tab === 'qr' && (
                  <div>
                    {!scanning ? (
                      <div className="text-center">
                        <div className="w-36 h-36 rounded-2xl bg-neu-light border-2 border-dashed border-neu-blue/25 flex flex-col items-center justify-center mx-auto mb-5">
                          <QrCode size={44} className="text-neu-blue/35 mb-2" strokeWidth={1.5} />
                          <p className="text-xs text-slate-400 font-medium">Camera off</p>
                        </div>
                        <button onClick={() => { setScanning(true); setError(''); }} className="btn-primary w-full">
                          <ScanLine size={17} />Start QR Scanner
                        </button>
                        <p className="text-xs text-slate-400 mt-4">
                          No QR code?{' '}
                          <a href="/register" className="text-neu-blue font-semibold hover:underline">Register here</a>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Scanning… Point your QR code at the camera
                        </p>
                        <QRScanner active={scanning} onResult={handleQR}
                          onError={(e) => { setError(e); setScanning(false); }} />
                        {loading && (
                          <p className="flex items-center justify-center gap-2 text-sm text-neu-blue mt-3">
                            <Loader2 size={15} className="animate-spin" /> Verifying…
                          </p>
                        )}
                        <button onClick={() => setScanning(false)} className="btn-secondary w-full mt-3 text-sm">Cancel</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Email tab */}
                {tab === 'email' && (
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                      <label className="label">NEU Email Address</label>
                      <input type="email" className="input" placeholder="yourname@neu.edu.ph"
                        value={email} onChange={e => setEmail(e.target.value)} required />
                      <p className="text-[11px] text-slate-400 mt-1">Must be your @neu.edu.ph email</p>
                    </div>
                    <div>
                      <label className="label">Student Number</label>
                        <input inputMode="numeric" type="tel" pattern="[0-9]*" className="input" placeholder="e.g., 24-13005-502"
                          value={sn} onChange={e => setSN(formatStudentNumberInput(e.target.value))} required />
                        <p className="text-[11px] text-slate-400 mt-1">Format: <span className="font-mono">24-13005-502</span></p>
                    </div>
                    <button type="submit" className="btn-primary w-full py-3.5" disabled={loading}>
                      {loading ? <><Loader2 size={16} className="animate-spin" />Verifying…</> : <><ChevronRight size={17} />Continue</>}
                    </button>
                    <p className="text-xs text-slate-400 text-center">
                      Not registered?{' '}
                      <a href="/register" className="text-neu-blue font-semibold hover:underline">Get your QR code</a>
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* ── STEP: PURPOSE (Time In) ── */}
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
                  <span className="text-xs font-semibold text-green-700">Time In</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>
              )}

              <p className="text-sm font-semibold text-slate-700 mb-3 text-center">Select your purpose of visit:</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {PURPOSES.map(p => (
                  <button key={p} onClick={() => setPurpose(p)}
                    className={`card-p cursor-pointer flex flex-col items-center gap-2 py-5 transition-all duration-200 ${
                      purpose === p
                        ? 'border-neu-blue bg-neu-light ring-2 ring-neu-blue/20 shadow-card-md'
                        : 'hover:border-neu-blue/25 hover:bg-neu-gray/60'
                    }`}>
                    <span className="text-3xl">{PURPOSE_EMOJI[p]}</span>
                    <span className={`text-sm font-semibold ${purpose === p ? 'text-neu-blue' : 'text-slate-700'}`}>{p}</span>
                  </button>
                ))}
              </div>

              <button onClick={handleTimeIn} disabled={!purpose || loading}
                className="btn-primary w-full py-3.5 text-base">
                {loading
                  ? <><Loader2 size={17} className="animate-spin" />Logging entry…</>
                  : <><LogIn size={18} />Confirm Time In</>}
              </button>
              <button onClick={reset} className="btn-secondary w-full mt-3 text-sm">← Go Back</button>
            </div>
          )}

          {/* ── STEP: CONFIRM TIME OUT ── */}
          {step === 'confirm-timeout' && activeSession && (
            <div className="animate-scale-in">
              <div className="card-p text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <LogOut size={26} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Time Out?</h2>
                <p className="text-sm text-slate-500 mb-1">
                  Hi, <span className="font-semibold text-slate-700">{activeSession.studentName}</span>
                </p>
                <p className="text-xs text-slate-400 mb-5">
                  You have an active library session. Click <b>Confirm Time Out</b> to log your departure.
                </p>

                {/* Time in info */}
                <div className="flex items-center justify-center gap-3 mb-5">
                  <div className="bg-neu-light rounded-xl px-4 py-2.5 border border-neu-border">
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Checked In</p>
                    <p className="text-sm font-bold text-neu-blue">
                      {new Date(activeSession.timeIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(activeSession.timeIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-slate-300 text-lg font-light">→</div>
                  <div className="bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-medium mb-0.5 uppercase tracking-wide">Time Out</p>
                    <p className="text-sm font-bold text-amber-700">
                      {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-[10px] text-amber-500">Now</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>
                )}

                <button onClick={handleTimeOut} disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 transition-all mb-3 disabled:opacity-60">
                  {loading
                    ? <><Loader2 size={17} className="animate-spin" />Recording…</>
                    : <><LogOut size={18} />Confirm Time Out</>}
                </button>
                <button onClick={reset} className="btn-secondary w-full text-sm">← Cancel</button>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-300">
        © {new Date().getFullYear()} New Era University Library
      </footer>
    </div>
  );
}
