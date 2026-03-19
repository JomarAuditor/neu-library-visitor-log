// src/pages/visitor/VisitorHome.tsx
// Changes: background image (Neu-Lib_Building.jpg) with color overlay,
//          professional warm messages, no "System", @neu.edu.ph restriction with clear warning,
//          auto time-in / time-out, instant UI (no blocking loader)
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, LogIn, CheckCircle, Clock } from 'lucide-react';
import { supabase }      from '@/lib/supabase';
import { useAuth }       from '@/hooks/useAuth';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI } from '@/types';
import { calcDurationMinutes, fmtDuration }      from '@/lib/utils';

type Phase = 'idle' | 'checking' | 'select-purpose' | 'timing-in' | 'timing-out' | 'done-in' | 'done-out' | 'error';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function VisitorHome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();

  const [phase,       setPhase]       = useState<Phase>('idle');
  const [purpose,     setPurpose]     = useState<VisitPurpose | null>(null);
  const [visitorId,   setVisitorId]   = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [timeInStamp, setTimeInStamp] = useState('');
  const [duration,    setDuration]    = useState(0);
  const [errMsg,      setErrMsg]      = useState('');
  const [gBusy,       setGBusy]       = useState(false);

  const justRegistered = params.get('registered') === '1';
  const regName        = params.get('name') ?? '';

  useEffect(() => {
    if (authLoading) return;
    if (justRegistered && regName) {
      setVisitorName(decodeURIComponent(regName));
      setPhase('done-in');
      const t = setTimeout(() => { signOut(); setPhase('idle'); }, 5000);
      return () => clearTimeout(t);
    }
    if (!user) { setPhase('idle'); return; }
    runSmartCheck();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, justRegistered]);

  const runSmartCheck = async () => {
    if (!user?.email) return;
    setPhase('checking');
    try {
      const { data: visitor } = await supabase
        .from('visitors').select('id, full_name, is_blocked')
        .eq('email', user.email.toLowerCase()).maybeSingle();

      if (!visitor) {
        navigate(
          `/register?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(
            user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
          )}`,
          { replace: true }
        );
        return;
      }

      if (visitor.is_blocked) {
        setErrMsg('Your library access has been restricted. Please contact the librarian for assistance.');
        setPhase('error');
        return;
      }

      setVisitorId(visitor.id);
      setVisitorName(visitor.full_name);

      const { data: openLog } = await supabase
        .from('visit_logs').select('id, time_in')
        .eq('visitor_id', visitor.id).is('time_out', null)
        .order('time_in', { ascending: false }).limit(1).maybeSingle();

      if (openLog) {
        setTimeInStamp(openLog.time_in);
        await doTimeOut(openLog.id, openLog.time_in);
      } else {
        setPhase('select-purpose');
      }
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Something went wrong. Please try again.');
      setPhase('error');
    }
  };

  const doTimeIn = async (pid: VisitPurpose) => {
    setPhase('timing-in');
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('visit_logs').insert({
        visitor_id: visitorId, purpose: pid, time_in: now, visit_date: now.split('T')[0],
      });
      if (error) throw error;
      setTimeInStamp(now);
      setPhase('done-in');
      setTimeout(() => { signOut(); setPhase('idle'); }, 5000);
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Could not record your entry. Please try again.');
      setPhase('error');
    }
  };

  const doTimeOut = async (logId: string, timeIn: string) => {
    setPhase('timing-out');
    try {
      const now = new Date().toISOString();
      const dur = calcDurationMinutes(timeIn, now);
      const { error } = await supabase.from('visit_logs')
        .update({ time_out: now, duration_minutes: dur }).eq('id', logId);
      if (error) throw error;
      setDuration(dur);
      setPhase('done-out');
      setTimeout(() => { signOut(); setPhase('idle'); }, 5000);
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Could not record your exit. Please try again.');
      setPhase('error');
    }
  };

  const handleGoogleSignIn = async () => {
    setGBusy(true); setErrMsg('');
    const { error } = await signInWithGoogle('/');
    if (error) { setErrMsg(error); setPhase('error'); setGBusy(false); }
  };

  const reset = () => signOut().then(() => { setPhase('idle'); setErrMsg(''); setPurpose(null); });

  const nowTimePH = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Shared card wrapper
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
      {children}
    </div>
  );

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* ── Background image with overlay ─────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/Neu-Lib_Building.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          loading="eager"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {/* Color overlay that preserves brand colors + ensures readability */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(0,30,120,0.82) 0%, rgba(0,48,135,0.78) 50%, rgba(13,30,60,0.85) 100%)' }} />
      </div>

      {/* Admin link */}
      <a href="/admin/login"
        className="absolute top-5 right-6 text-white/40 hover:text-white/70 text-xs font-medium transition-colors z-20">
        Admin Portal →
      </a>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo + title */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-50"
                style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }} />
              <img src="/neu-logo.svg" alt="NEU"
                className="relative h-24 w-24 object-contain drop-shadow-2xl"
                onError={e => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.tried) { img.dataset.tried = '1'; img.src = '/NEU%20Library%20logo.png'; }
                  else img.style.display = 'none';
                }} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            NEU Library
          </h1>
          <p className="text-white/55 text-sm mt-1 font-medium">Visitor Log · New Era University</p>
        </div>

        {/* ── IDLE ─────────────────────────────────────────────────── */}
        {phase === 'idle' && !authLoading && (
          <Card>
            <div className="p-7 text-center">
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                Sign in with your NEU Google account to record your library visit.
              </p>
              <button onClick={handleGoogleSignIn} disabled={gBusy}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-sm font-bold text-slate-700 transition-all shadow-sm disabled:opacity-60">
                {gBusy ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <GoogleIcon />}
                {gBusy ? 'Opening Google…' : 'Sign in with Google'}
              </button>
              <p className="text-[11px] text-slate-400 mt-4 font-medium">
                Only <span className="font-bold text-slate-500">@neu.edu.ph</span> accounts are accepted
              </p>
            </div>
          </Card>
        )}

        {/* ── CHECKING / PROCESSING ─────────────────────────────────── */}
        {(phase === 'checking' || phase === 'timing-in' || authLoading) && (
          <Card>
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Loader2 size={26} className="animate-spin text-blue-600" />
              </div>
              <p className="text-slate-700 text-sm font-semibold">
                {phase === 'timing-in' ? 'Recording your visit…' : 'Verifying your account…'}
              </p>
              <p className="text-slate-400 text-xs mt-1">This will only take a moment</p>
            </div>
          </Card>
        )}

        {/* ── TIMING OUT ────────────────────────────────────────────── */}
        {phase === 'timing-out' && (
          <Card>
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Loader2 size={26} className="animate-spin text-amber-500" />
              </div>
              <p className="text-slate-700 text-sm font-semibold">Recording your exit…</p>
              <p className="text-slate-400 text-xs mt-1">Almost done</p>
            </div>
          </Card>
        )}

        {/* ── SELECT PURPOSE ────────────────────────────────────────── */}
        {phase === 'select-purpose' && (
          <Card>
            <div className="bg-blue-600 px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <LogIn size={16} className="text-white/80" />
                <p className="text-white font-bold">Welcome back, {visitorName.split(' ')[0]}!</p>
              </div>
              <p className="text-white/60 text-xs">Please select your reason for visiting today</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                {PURPOSES.map(p => (
                  <button key={p} onClick={() => setPurpose(p)}
                    className="rounded-xl border-2 py-4 flex flex-col items-center gap-2 transition-all duration-150"
                    style={{
                      borderColor: purpose === p ? '#2563EB' : '#E2E8F0',
                      background:  purpose === p ? '#EFF6FF' : '#FAFAFA',
                    }}>
                    <span className="text-2xl">{PURPOSE_EMOJI[p]}</span>
                    <span className="text-[11px] font-bold" style={{ color: purpose === p ? '#2563EB' : '#64748B' }}>{p}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => purpose && doTimeIn(purpose)} disabled={!purpose}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-sm">
                <LogIn size={16} /> Record My Visit
              </button>
              <button onClick={reset} className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Sign out
              </button>
            </div>
          </Card>
        )}

        {/* ── SUCCESS: TIME IN ──────────────────────────────────────── */}
        {phase === 'done-in' && (
          <Card>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Welcome to the Library!
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-1">
                {visitorName ? `Good to see you, ${visitorName.split(' ')[0]}.` : 'Your entry has been recorded.'}
              </p>
              <p className="text-green-600 font-bold text-sm">{nowTimePH}</p>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                <span>Returning to home shortly…</span>
              </div>
            </div>
          </Card>
        )}

        {/* ── SUCCESS: TIME OUT ─────────────────────────────────────── */}
        {phase === 'done-out' && (
          <Card>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Thank You for Visiting!
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {visitorName
                  ? `Safe travels, ${visitorName.split(' ')[0]}. You have successfully timed out.`
                  : 'You have successfully timed out.'}
              </p>
              {duration > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-bold">
                  <Clock size={14} />
                  {fmtDuration(duration)} visit
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                <span>Returning to home shortly…</span>
              </div>
            </div>
          </Card>
        )}

        {/* ── ERROR ─────────────────────────────────────────────────── */}
        {phase === 'error' && (
          <Card>
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-slate-700 text-sm font-semibold leading-relaxed mb-5">{errMsg}</p>
              <button onClick={reset}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm">
                Try Again
              </button>
            </div>
          </Card>
        )}
      </div>

      <p className="relative z-10 mt-6 text-white/20 text-[10px] font-medium text-center">
        © {new Date().getFullYear()} New Era University · Library Visitor Log
      </p>
    </div>
  );
}
