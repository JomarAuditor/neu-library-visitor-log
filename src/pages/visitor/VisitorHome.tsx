// src/pages/visitor/VisitorHome.tsx
// Enterprise-grade visitor authentication with enhanced security feedback
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2, Clock, ShieldAlert, XCircle,
} from 'lucide-react';
import { supabase }  from '@/lib/supabase';
import { useAuth }   from '@/hooks/useAuth';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI } from '@/types';
import { calcDurationMinutes, fmtDuration } from '@/lib/utils';
import { sanitizeName, sanitizeEmail, authRateLimiter, secureLog } from '@/lib/security';

type Phase =
  | 'idle'
  | 'checking'
  | 'select-purpose'
  | 'working'
  | 'error';

// ── Manila clock ──────────────────────────────────────────────────────
function useManilaTime() {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const m = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return {
    hh:  String(m.getHours() % 12 || 12).padStart(2, '0'),
    mm:  String(m.getMinutes()).padStart(2, '0'),
    ss:  String(m.getSeconds()).padStart(2, '0'),
    ap:  m.getHours() >= 12 ? 'PM' : 'AM',
    day: m.toLocaleDateString('en-PH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
}

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// ── Block popup ───────────────────────────────────────────────────────
function BlockPopup({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const isSuspended = message.toLowerCase().includes('suspended') || message.toLowerCase().includes('blocked');
  const isNonNEU = message.toLowerCase().includes('only @neu.edu.ph');
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
    >
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'scaleIn .2s ease-out' }}>
        <div className={`px-6 pt-7 pb-5 text-center ${isSuspended ? 'bg-orange-600' : 'bg-red-600'}`}>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            {isSuspended
              ? <XCircle    size={32} className="text-white" />
              : <ShieldAlert size={32} className="text-white" />}
          </div>
          <h2 className="text-white font-black text-xl mb-1">
            {isSuspended ? 'Account Suspended' : isNonNEU ? 'Access Denied' : 'Access Denied'}
          </h2>
          {isNonNEU && (
            <p className="text-white/80 text-sm font-medium">Only NEU accounts are allowed.</p>
          )}
        </div>
        <div className="bg-white px-6 py-5 text-center">
          {isSuspended ? (
            <>
              <p className="text-slate-700 font-bold text-sm mb-2">
                You are currently blocked from library access.
              </p>
              <p className="text-slate-400 text-xs leading-relaxed mb-5">
                Please contact the Library Admin to resolve this issue.
              </p>
            </>
          ) : isNonNEU ? (
            <>
              <p className="text-slate-700 font-bold text-sm mb-2">
                Only @neu.edu.ph institutional emails are allowed.
              </p>
              <p className="text-slate-400 text-xs leading-relaxed mb-5">
                Please sign in using your official NEU Google account to access the library system.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-700 font-bold text-sm mb-2">
                Only @neu.edu.ph institutional emails are allowed.
              </p>
              <p className="text-slate-400 text-xs leading-relaxed mb-5">
                Please sign in using your official NEU Google account.
              </p>
            </>
          )}
          <button
            onClick={onDismiss}
            className={`w-full py-3 rounded-2xl text-white font-black text-sm transition-all ${
              isSuspended ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            Dismiss
          </button>
        </div>
      </div>
      <style>{`
        @keyframes scaleIn { from{transform:scale(.88);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function VisitorHome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    user, loading: authLoading,
    signInWithGoogle, signOut,
    blockReason, clearBlockReason,
    authModal, clearAuthModal,
  } = useAuth();
  const clock = useManilaTime();

  const [phase,     setPhase]     = useState<Phase>('idle');
  const [errMsg,    setErrMsg]    = useState('');
  const [purpose,   setPurpose]   = useState<VisitPurpose | null>(null);
  const [visitorId, setVisitorId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gBusy,     setGBusy]     = useState(false);

  const showPopup = !!blockReason || !!authModal;

  // Check URL for Supabase errors on mount
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace('#', ''));
    const errorCode = search.get('error') || hash.get('error');
    const errorDesc = search.get('error_description') || hash.get('error_description');

    if (errorCode === 'server_error' || errorDesc?.includes('Database error')) {
      console.error('❌ Non-NEU email blocked by database trigger:', {
        error: errorCode,
        description: errorDesc,
        url: window.location.href
      });
      console.warn('⚠️ User attempted sign-in with non-@neu.edu.ph email');
      // Trigger the popup via blockReason mechanism
      setErrMsg('Only @neu.edu.ph institutional emails are allowed.');
      setPhase('error');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // No auto-reset timer on this page — success goes to /success route
  useEffect(() => {
    if (authLoading) return;
    if (blockReason) return;

    if (!user) {
      if (phase !== 'error') setPhase('idle');
      return;
    }
    runSmartToggle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, blockReason]);

  const runSmartToggle = async () => {
    if (!user?.email) return;
    setPhase('checking');
    try {
      const email = user.email.toLowerCase().trim();
      
      // Step 1: Get visitor record
      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .select('id, full_name, is_blocked')
        .eq('email', email)
        .maybeSingle();

      if (visitorError) throw visitorError;

      if (!visitor) {
        // Not registered - redirect to registration
        navigate(
          `/register?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(
            user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
          )}`,
          { replace: true }
        );
        return;
      }

      if (visitor.is_blocked) {
        setErrMsg('Account Suspended: You are currently blocked from library access. Please contact the administrator.');
        setPhase('error');
        await signOut();
        return;
      }

      setVisitorId(visitor.id);
      setFirstName(visitor.full_name.split(' ')[0]);

      // Step 2: SMART TOGGLE - Check for open session and handle it
      const { data: openLog, error: logError } = await supabase
        .from('visit_logs')
        .select('id, time_in, purpose')
        .eq('visitor_id', visitor.id)
        .is('time_out', null)
        .order('time_in', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) throw logError;

      if (openLog) {
        // User has an active session - TIME OUT automatically
        await doTimeOut(openLog.id, openLog.time_in, visitor.full_name.split(' ')[0]);
        return;
      }
      
      // No active session - Allow TIME IN immediately
      setPhase('select-purpose');
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Something went wrong. Please try again.');
      setPhase('error');
    }
  };

  const doTimeIn = async (pid: VisitPurpose) => {
    setPhase('working');
    try {
      const now = new Date().toISOString();
      
      // CRITICAL: Close ANY existing open session first
      const { data: existingOpen } = await supabase
        .from('visit_logs')
        .select('id, time_in')
        .eq('visitor_id', visitorId)
        .is('time_out', null)
        .maybeSingle();

      if (existingOpen) {
        const dur = calcDurationMinutes(existingOpen.time_in, now);
        const { error: updateError } = await supabase
          .from('visit_logs')
          .update({ time_out: now, duration_minutes: dur })
          .eq('id', existingOpen.id);
        
        if (updateError) {
          console.error('Error closing session:', updateError);
        }
      }
      
      // Try to insert new session
      const { error } = await supabase.from('visit_logs').insert({
        visitor_id: visitorId,
        purpose: pid,
        time_in: now,
        visit_date: now.split('T')[0],
      });
      
      if (error) {
        // If duplicate error, try one more time after closing all sessions
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          // Force close ALL sessions for this visitor
          await supabase
            .from('visit_logs')
            .update({ 
              time_out: now, 
              duration_minutes: 0 
            })
            .eq('visitor_id', visitorId)
            .is('time_out', null);
          
          // Try insert again
          const { error: retryError } = await supabase.from('visit_logs').insert({
            visitor_id: visitorId,
            purpose: pid,
            time_in: now,
            visit_date: now.split('T')[0],
          });
          
          if (retryError) {
            setErrMsg('Database constraint active. Please contact admin to remove the constraint.');
            setPhase('error');
            await signOut();
            return;
          }
        } else {
          throw error;
        }
      }

      // Time string in PHT
      const timeStr = new Date().toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      // Sign out auth session, then go to success page
      await signOut();
      navigate(
        `/success?action=in&name=${encodeURIComponent(firstName)}&time=${encodeURIComponent(timeStr)}`,
        { replace: true }
      );
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Could not record your entry.');
      setPhase('error');
    }
  };

  const doTimeOut = async (logId: string, timeIn: string, name: string) => {
    setPhase('working');
    try {
      const now = new Date().toISOString();
      const dur = calcDurationMinutes(timeIn, now);
      
      // CRITICAL: Update the existing record with time_out
      // This completes the visit and prevents duplicate "Inside" entries
      const { error } = await supabase
        .from('visit_logs')
        .update({ time_out: now, duration_minutes: dur })
        .eq('id', logId);
        
      if (error) throw error;

      const timeStr = new Date().toLocaleTimeString('en-PH', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      await signOut();
      navigate(
        `/success?action=out&name=${encodeURIComponent(name || firstName)}&time=${encodeURIComponent(timeStr)}&duration=${encodeURIComponent(fmtDuration(dur))}`,
        { replace: true }
      );
    } catch (e: unknown) {
      setErrMsg((e as Error)?.message ?? 'Could not record your time out.');
      setPhase('error');
    }
  };

  const handleGoogleSignIn = async () => {
    clearBlockReason(); setErrMsg(''); setGBusy(true);
    
    try {
      secureLog('info', 'Google sign-in attempt initiated');
      const { error } = await signInWithGoogle('/');
      if (error) { 
        secureLog('error', 'Google sign-in failed', { error });
        setErrMsg(error); 
        setPhase('error'); 
      }
    } catch (e) {
      secureLog('error', 'Google sign-in exception', { error: (e as Error)?.message });
      setErrMsg('Sign-in failed. Please try again.');
      setPhase('error');
    } finally {
      setGBusy(false);
    }
  };

  const reset = () => {
    clearBlockReason(); setErrMsg(''); setPurpose(null);
    signOut().then(() => setPhase('idle'));
  };

  return (
    <>
      {/* Show blockReason popup if exists */}
      {blockReason && <BlockPopup message={blockReason} onDismiss={clearBlockReason} />}
      
      {/* AuthModal is rendered globally in AuthProvider, but we can also show blockReason here */}

      <div className="min-h-screen relative">
        {/* Fixed background */}
        <div
          className="fixed inset-0 -z-10"
          style={{
            backgroundImage: "url('/Neu-Lib_Building.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
          aria-hidden
        />
        {/* Fixed dark overlay */}
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: 'linear-gradient(160deg,rgba(0,20,80,.82) 0%,rgba(0,50,160,.78) 50%,rgba(0,20,80,.86) 100%)',
          }}
          aria-hidden
        />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <a href="/admin/login"
            className="absolute top-5 right-7 text-white/50 hover:text-white/80 text-sm font-medium transition-colors">
            Admin Portal →
          </a>

          <div className="w-full max-w-md flex flex-col items-center gap-5">

            {/* Clock */}
            <div className="text-center select-none">
              <div
                className="flex items-end justify-center gap-2"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <span
                  className="text-white font-black leading-none"
                  style={{
                    fontSize: 'clamp(56px, 10vw, 88px)',
                    textShadow: '0 4px 24px rgba(0,0,0,.6)',
                    letterSpacing: '-2px',
                  }}
                >
                  {clock.hh}:{clock.mm}
                </span>
                <div className="pb-2 flex flex-col items-start gap-0.5">
                  <span className="text-white font-black text-xl leading-none">{clock.ap}</span>
                  <span className="text-white/50 font-bold text-base tabular-nums leading-none">:{clock.ss}</span>
                </div>
              </div>
              <p className="text-white/65 text-xs font-semibold mt-1.5 tracking-wide">{clock.day}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Clock size={9} className="text-white/35" />
                <span className="text-white/35 text-[9px] font-bold uppercase tracking-widest">
                  Philippine Standard Time
                </span>
              </div>
            </div>

            {/* Logo + title */}
            <div className="text-center">
              <img
                src="/NEU%20Library%20logo.png"
                alt="NEU"
                className="h-24 w-24 object-contain mx-auto mb-3 drop-shadow-2xl"
                onError={e => {
                  const i = e.currentTarget as HTMLImageElement;
                  if (!i.dataset.t) { i.dataset.t = '1'; i.src = '/neu-logo.svg'; }
                  else i.style.display = 'none';
                }}
              />
              <h1
                className="text-white font-bold text-3xl tracking-tight"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,.5)' }}
              >
                NEU Library
              </h1>
              <p className="text-white/55 text-sm mt-0.5 font-medium">
                Visitor Log · New Era University
              </p>
            </div>

            {/*
              CRITICAL FIX: bg-white NOT bg-white/90
              Semi-transparent white caused text to be unreadable against the dark bg.
              Solid white card = always readable.
            */}
            <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden">

              {/* IDLE */}
              {phase === 'idle' && (
                <div className="px-8 py-8 text-center">
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    Sign in with your <strong className="text-neu-blue">@neu.edu.ph</strong> account to record your library visit.
                    The application will automatically check you{' '}
                    <strong className="text-slate-800">in</strong> or{' '}
                    <strong className="text-slate-800">out</strong>.
                  </p>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={gBusy}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60 shadow-sm"
                  >
                    {gBusy ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <GoogleIcon size={18} />}
                    {gBusy ? 'Opening Google…' : 'Sign in with Google'}
                  </button>
                  <p className="text-slate-400 text-[11px] mt-4">
                    Only <strong className="text-slate-600">@neu.edu.ph</strong> institutional emails are accepted
                  </p>
                </div>
              )}

              {/* CHECKING / WORKING */}
              {(phase === 'checking' || phase === 'working' || authLoading) && (
                <div className="px-8 py-10 text-center">
                  <Loader2 size={32} className="animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-slate-700 text-sm font-semibold">
                    {phase === 'working' ? 'Recording your visit…' : 'Verifying your account…'}
                  </p>
                  <p className="text-slate-400 text-xs mt-1">This only takes a moment</p>
                </div>
              )}

              {/* PURPOSE PICKER */}
              {phase === 'select-purpose' && (
                <>
                  <div className="px-6 pt-6 pb-3 text-center border-b border-slate-100">
                    <p className="font-bold text-slate-800 text-base">
                      Hello, <span className="text-blue-600">{firstName}</span>!
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">What brings you to the library today?</p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {PURPOSES.map(p => (
                        <button
                          key={p}
                          onClick={() => setPurpose(p)}
                          className="rounded-xl border-2 py-4 px-3 flex flex-col items-center gap-2 transition-all"
                          style={{
                            borderColor: purpose === p ? '#2563EB' : '#E2E8F0',
                            background:  purpose === p ? '#EFF6FF' : '#F9FAFB',
                            transform:   purpose === p ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <span className="text-2xl">{PURPOSE_EMOJI[p]}</span>
                          <span
                            className="text-[11px] font-bold text-center leading-tight"
                            style={{ color: purpose === p ? '#2563EB' : '#64748B' }}
                          >
                            {p}
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => purpose && doTimeIn(purpose)}
                      disabled={!purpose}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-40 transition-all shadow-sm"
                    >
                      Confirm Time In
                    </button>
                    <button
                      onClick={reset}
                      className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Cancel — use a different account
                    </button>
                  </div>
                </>
              )}

              {/* ERROR */}
              {phase === 'error' && (
                <div className="px-8 py-9 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={26} className="text-red-500" />
                  </div>
                  <p className="text-slate-900 font-black text-base mb-2">Sign-In Blocked</p>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">{errMsg}</p>
                  <button
                    onClick={reset}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            <p className="text-white/30 text-[11px] font-medium">
              © {new Date().getFullYear()} New Era University · Library Visitor Log
            </p>
          </div>
        </div>
      </div>
    </>
  );
}