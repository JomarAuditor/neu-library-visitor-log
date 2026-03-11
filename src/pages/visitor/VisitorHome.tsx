import { useState, FormEvent } from 'react';
import {
  QrCode, Mail, ScanLine, ChevronRight,
  Loader2, ArrowRight, LogIn, LogOut, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { NEULogo } from '@/components/NEULogo';
import { QRScanner } from '@/components/visitor/QRScanner';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI } from '@/types';
import {
  validateNEUEmail, decodeQR, calcDurationMinutes,
  validateStudentNumber, formatStudentNumber, studentNumberHint,
} from '@/lib/utils';

type Tab  = 'qr' | 'email';
type Step = 'login' | 'purpose' | 'confirm-timeout';

interface ActiveSession { logId: string; studentId: string; studentName: string; timeIn: string; }

export default function VisitorHome() {
  const navigate = useNavigate();

  const [tab,      setTab]      = useState<Tab>('qr');
  const [step,     setStep]     = useState<Step>('login');
  const [loading,  setLoading]  = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState('');

  const [email, setEmail] = useState('');
  const [sn,    setSN]    = useState('');
  const snHint = studentNumberHint(sn);

  const [studentId,    setStudentId]    = useState('');
  const [studentName,  setStudentName]  = useState('');
  const [loginMethod,  setLoginMethod]  = useState<'QR Code' | 'Email'>('QR Code');
  const [purpose,      setPurpose]      = useState<VisitPurpose | null>(null);
  const [activeSession,setActiveSession]= useState<ActiveSession | null>(null);

  const lookupStudent = async (emailVal: string, snVal: string) => {
    try {
      const { data: stu, error: e } = await supabase
        .from('students')
        .select('id, name, is_blocked')
        .eq('email', emailVal.toLowerCase().trim())
        .eq('student_number', snVal.trim())
        .single();
      if (e || !stu) return { error: 'Student not found. Please check your credentials or register first.' };
      if (stu.is_blocked) return { error: 'Your library access has been restricted. Please contact the librarian.' };
      return { student: stu };
    } catch (err) {
      return { error: 'A network error occurred. Please try again.' };
    }
  };

  const checkActiveSession = async (sid: string) => {
    try {
      const { data } = await supabase
        .from('visitor_logs')
        .select('id, time_in')
        .eq('student_id', sid)
        .is('time_out', null)
        .order('time_in', { ascending: false })
        .limit(1)
        .single();
      return data as { id: string; time_in: string } | null;
    } catch { return null; }
  };

  const processStudent = async (sid: string, name: string, method: 'QR Code' | 'Email') => {
    setStudentId(sid); setStudentName(name); setLoginMethod(method);
    const open = await checkActiveSession(sid);
    if (open) {
      setActiveSession({ logId: open.id, studentId: sid, studentName: name, timeIn: open.time_in });
      setStep('confirm-timeout');
    } else {
      setStep('purpose');
    }
  };

  const handleQR = async (raw: string) => {
    setError(''); setLoading(true); setScanning(false);
    const decoded = decodeQR(raw);
    if (!decoded) { setError('Invalid QR code format. Please register first.'); setLoading(false); return; }
    const res = await lookupStudent(decoded.email, decoded.studentNumber);
    setLoading(false);
    if ('error' in res) { setError(res.error); return; }
    await processStudent(res.student.id, res.student.name, 'QR Code');
  };

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!validateNEUEmail(email)) { setError('Please use your official @neu.edu.ph email address.'); return; }
    if (!sn.trim()) { setError('Student number is required.'); return; }
    if (!validateStudentNumber(sn)) { setError('Invalid student number format. Must be: YY-NNNNN-NNN (e.g. 24-13005-502)'); return; }
    setLoading(true);
    const res = await lookupStudent(email, sn);
    setLoading(false);
    if ('error' in res) { setError(res.error); return; }
    await processStudent(res.student.id, res.student.name, 'Email');
  };

  const handleTimeIn = async () => {
    if (!purpose) return;
    setLoading(true); setError('');
    try {
      const now = new Date().toISOString();
      const { error: e } = await supabase.from('visitor_logs').insert({
        student_id: studentId, purpose, login_method: loginMethod,
        time_in: now, time_out: null, duration_minutes: null, date: now.split('T')[0],
      });
      if (e) throw e;
      navigate('/welcome?action=in&name=' + encodeURIComponent(studentName));
    } catch (err: any) {
      setError('Failed to log entry: ' + (err?.message || 'Please try again.'));
    } finally { setLoading(false); }
  };

  const handleTimeOut = async () => {
    if (!activeSession) return;
    setLoading(true); setError('');
    try {
      const now = new Date().toISOString();
      const dur = calcDurationMinutes(activeSession.timeIn, now);
      const { error: e } = await supabase.from('visitor_logs')
        .update({ time_out: now, duration_minutes: dur })
        .eq('id', activeSession.logId);
      if (e) throw e;
      navigate('/welcome?action=out&name=' + encodeURIComponent(activeSession.studentName) + '&dur=' + dur);
    } catch (err: any) {
      setError('Failed to record time out: ' + (err?.message || 'Please try again.'));
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep('login'); setError(''); setScanning(false); setLoading(false);
    setStudentId(''); setStudentName(''); setPurpose(null); setActiveSession(null);
    setEmail(''); setSN('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neu-gray via-white to-neu-light flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neu-border shadow-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NEULogo size={40} />
            <div>
              <p className="text-[11px] font-bold text-neu-blue tracking-widest uppercase leading-none">New Era University</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Library Visitor Log System</p>
            </div>
          </div>
          <a href="/admin/login" className="text-xs text-slate-400 hover:text-neu-blue flex items-center gap-1 transition-colors font-medium">
            Admin <ArrowRight size={12} />
          </a>
        </div>
      </header>

      {/* Main — centered kiosk card, wider on desktop */}
      <main className="flex-1 flex items-start lg:items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* ── STEP: LOGIN ── */}
          {step === 'login' && (
            <div className="animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-neu-blue flex items-center justify-center mx-auto mb-4 shadow-card-md">
                  <ScanLine size={28} className="text-white" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Welcome to NEU Library</h1>
                <p className="text-sm text-slate-500 mt-1">Sign in to record your library visit</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-neu-gray rounded-2xl p-1.5 mb-4 border border-neu-border">
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
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                {/* QR tab */}
                {tab === 'qr' && (
                  <div>
                    {!scanning ? (
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
                        {loading && (
                          <div className="flex items-center justify-center gap-2 text-sm text-neu-blue mt-3">
                            <Loader2 size={15} className="animate-spin" /> Verifying student…
                          </div>
                        )}
                        <button onClick={() => setScanning(false)} className="btn-secondary w-full mt-3 text-sm py-2.5">
                          Cancel Scanner
                        </button>
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
                        value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                      <p className="text-[11px] text-slate-400 mt-1">Must end with @neu.edu.ph</p>
                    </div>
                    <div>
                      <label className="label">Student Number</label>
                      <input type="text" className={`input ${snHint ? 'border-amber-300 focus:border-amber-400' : ''}`}
                        placeholder="24-13005-502"
                        value={sn}
                        onChange={e => setSN(formatStudentNumber(e.target.value))}
                        maxLength={12}
                        required />
                      {snHint && <p className="text-[11px] text-amber-600 mt-1 font-medium">{snHint}</p>}
                      {!snHint && sn && <p className="text-[11px] text-green-600 mt-1 font-medium">✓ Valid format</p>}
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
                <p className="text-sm text-slate-500 mt-1">Hello, <span className="font-semibold text-slate-700">{studentName}</span>!</p>
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
                        : 'hover:border-neu-blue/25 hover:bg-neu-gray/60'
                    }`}>
                    <span className="text-3xl">{PURPOSE_EMOJI[p]}</span>
                    <span className={`text-sm font-semibold ${purpose === p ? 'text-neu-blue' : 'text-slate-700'}`}>{p}</span>
                  </button>
                ))}
              </div>

              <button onClick={handleTimeIn} disabled={!purpose || loading} className="btn-primary w-full py-3.5 text-base">
                {loading ? <><Loader2 size={17} className="animate-spin" />Logging entry…</> : <><LogIn size={18} />Confirm Time In</>}
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
                <p className="text-sm text-slate-500 mb-1">Hi, <span className="font-semibold text-slate-700">{activeSession.studentName}</span></p>
                <p className="text-xs text-slate-400 mb-5">You have an active library session. Click <b>Confirm Time Out</b> to log your departure.</p>

                <div className="flex items-center justify-center gap-3 mb-5">
                  <div className="bg-neu-light rounded-xl px-4 py-2.5 border border-neu-border">
                    <p className="text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wide">Checked In</p>
                    <p className="text-sm font-bold text-neu-blue">
                      {new Date(activeSession.timeIn).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(activeSession.timeIn).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-slate-300 text-xl">→</div>
                  <div className="bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-medium mb-0.5 uppercase tracking-wide">Time Out</p>
                    <p className="text-sm font-bold text-amber-700">
                      {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-[10px] text-amber-500">Now</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
                  </div>
                )}

                <button onClick={handleTimeOut} disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 transition-all mb-3 disabled:opacity-60">
                  {loading ? <><Loader2 size={17} className="animate-spin" />Recording…</> : <><LogOut size={18} />Confirm Time Out</>}
                </button>
                <button onClick={reset} className="btn-secondary w-full text-sm">← Cancel</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-[11px] text-slate-300">
        © {new Date().getFullYear()} New Era University · Library Visitor Log System
      </footer>
    </div>
  );
}
