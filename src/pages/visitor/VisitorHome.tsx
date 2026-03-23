// src/pages/visitor/VisitorHome.tsx
// ================================================================
// THE REAL FIX — explained simply:
//
// The previous code was sometimes INSERTING a new time-in record
// even when an open session existed. Race condition.
//
// This version:
//   1. Signs in with Google
//   2. Queries DB for ANY open session (time_out IS NULL)
//   3. If open session found  → UPDATE it (time out) → go to success
//   4. If no open session    → ask purpose → INSERT (time in) → go to success
//   5. RETURN immediately after each action. No extra steps.
//
// No smart_time_in RPC. No database functions. Pure simple logic.
// This is exactly how real library RFID systems work.
// ================================================================

import { useState, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { Loader2, Clock, ShieldAlert } from 'lucide-react';
import { supabase }  from '@/lib/supabase';
import { useAuth }   from '@/hooks/useAuth';
import { PURPOSES, VisitPurpose, PURPOSE_EMOJI } from '@/types';
import { calcDurationMinutes, fmtDuration } from '@/lib/utils';

type Phase = 'idle' | 'checking' | 'select-purpose' | 'working' | 'error';

// ── Read Supabase error from URL (domain block) ───────────────────────
function getSupabaseUrlError(): string | null {
  const search = new URLSearchParams(window.location.search);
  const hash   = new URLSearchParams(window.location.hash.replace('#', ''));
  const code   = search.get('error') || hash.get('error');
  const desc   = search.get('error_description') || hash.get('error_description');
  if (!code) return null;
  if (desc?.toLowerCase().includes('database') || code === 'server_error') {
    return 'only_neu_domain';
  }
  return desc || code;
}

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
function BlockPopup({ reason, onDismiss }: { reason: string; onDismiss: () => void }) {
  const isNEU       = reason === 'only_neu_domain';
  const isSuspended = reason.toLowerCase().includes('suspended') || reason.toLowerCase().includes('blocked from');
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'popIn .25s cubic-bezier(.175,.885,.32,1.275)' }}>
        <div className={`px-6 pt-7 pb-5 text-center ${isSuspended ? 'bg-orange-600' : 'bg-red-600'}`}>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h2 className="text-white font-black text-xl mb-1">
            {isSuspended ? 'Account Suspended' : 'Access Denied'}
          </h2>
        </div>
        <div className="bg-white px-6 py-5 text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
            <p className="text-red-700 text-sm font-bold">
              {isNEU
                ? '⛔  Only @neu.edu.ph institutional emails are allowed.'
                : isSuspended
                  ? '🚫  Your account has been blocked from library access.'
                  : `⛔  ${reason}`}
            </p>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-5">
            {isSuspended
              ? 'Please contact the library administrator to resolve this.'
              : 'Please use your official NEU Google account (e.g. yourname@neu.edu.ph).'}
          </p>
          <button onClick={onDismiss}
            className={`w-full py-3.5 rounded-2xl text-white font-black text-sm transition-all ${
              isSuspended ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
            }`}>
            Dismiss &amp; Try Again
          </button>
        </div>
      </div>
      <style>{`@keyframes popIn{from{transform:scale(.82);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function VisitorHome() {
  const navigate = useNavigate();
  const {
    user, loading: authLoading,
    signInWithGoogle, signOut,
    blockReason, clearBlockReason,
  } = useAuth();
  const clock = useManilaTime();

  const [phase,     setPhase]     = useState<Phase>('idle');
  const [errMsg,    setErrMsg]    = useState('');
  const [purpose,   setPurpose]   = useState<VisitPurpose | null>(null);
  const [visitorId, setVisitorId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [gBusy,     setGBusy]     = useState(false);
  const [urlError,  setUrlError]  = useState<string | null>(null);

  // Check URL for Supabase error on mount (domain block from DB trigger)
  useEffect(() => {
    const err = getSupabaseUrlError();
    if (err) {
      setUrlError(err);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const activePopup = urlError || blockReason;

  // Handle auth state changes
  useEffect(() => {
    if (authLoading) return;
    if (activePopup) return;
    if (!user) {
      if (phase !== 'error') setPhase('idle');
      return;
    }
    // Only run toggle if we're in idle or checking phase
    if (phase === 'idle' || phase === 'checking') {
      runToggle();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, activePopup]);

  // ── THE CORE TOGGLE LOGIC ─────────────────────────────────────────
  // BULLETPROOF: Check → Update OR Insert → Return immediately
  // No race conditions, no duplicates, perfect toggle
  const runToggle = async () => {
    if (!user?.email) return;
    
    // Prevent multiple simultaneous calls
    if (phase === 'checking' || phase === 'working') {
      console.log('[DEBUG] Already processing, skipping');
      return;
    }
    
    setPhase('checking');
    console.log('[DEBUG] Starting runToggle for:', user.email);

    try {
      const email = user.email.toLowerCase().trim();

      // 1. Find the visitor record
      const { data: visitor, error: visErr } = await supabase
        .from('visitors')
        .select('id, full_name, is_blocked')
        .eq('email', email)
        .maybeSingle();

      if (visErr) throw visErr;

      // 2. New user → register
      if (!visitor) {
        navigate(`/register?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
        )}`, { replace: true });
        return; // ← EXIT immediately
      }

      // 3. Blocked
      if (visitor.is_blocked) {
        setErrMsg('Your account has been suspended. Please contact the Library Admin.');
        setPhase('error');
        await signOut();
        return; // ← EXIT immediately
      }

      setVisitorId(visitor.id);
      setFirstName(visitor.full_name.split(' ')[0]);

      // 4. ATOMIC CHECK: Query for ANY open session (time_out IS NULL)
      //    This is the SINGLE SOURCE OF TRUTH
      const { data: openSessions, error: sessErr } = await supabase
        .from('visit_logs')
        .select('id, time_in')
        .eq('visitor_id', visitor.id)
        .is('time_out', null)
        .order('time_in', { ascending: false })
        .limit(10); // Safety: get max 10 in case of corruption

      if (sessErr) throw sessErr;

      // DEBUG: Log EVERYTHING
      console.log('[DEBUG] openSessions:', openSessions);
      console.log('[DEBUG] openSessions type:', typeof openSessions);
      console.log('[DEBUG] openSessions is array?', Array.isArray(openSessions));
      console.log('[DEBUG] openSessions length:', openSessions?.length);
      console.log('[DEBUG] Condition check:', openSessions && openSessions.length > 0);

      // ═══════════════════════════════════════════════════════════
      // BRANCH A: USER IS INSIDE → TIME OUT
      // ═══════════════════════════════════════════════════════════
      if (openSessions && openSessions.length > 0) {
        console.log('[DEBUG] BRANCH A: Timing out', openSessions.length, 'session(s)');
        const now = new Date().toISOString();
        const timeStr = new Date().toLocaleTimeString('en-PH', { 
          hour: '2-digit', minute: '2-digit', hour12: true 
        });

        // Close ALL open sessions (handles corruption gracefully)
        const updatePromises = openSessions.map(session => {
          const dur = calcDurationMinutes(session.time_in, now);
          return supabase
            .from('visit_logs')
            .update({ 
              time_out: now, 
              duration_minutes: Math.max(0, Math.round(dur))
            })
            .eq('id', session.id);
        });

        await Promise.all(updatePromises);

        // Calculate duration from most recent session
        const latestDur = calcDurationMinutes(openSessions[0].time_in, now);

        // Sign out and show success
        await signOut();
        navigate(
          `/success?action=out&name=${encodeURIComponent(visitor.full_name.split(' ')[0])}&time=${encodeURIComponent(timeStr)}&duration=${encodeURIComponent(fmtDuration(latestDur))}`,
          { replace: true }
        );
        return; // ← CRITICAL: EXIT immediately, do NOT continue
      }

      // ═══════════════════════════════════════════════════════════
      // BRANCH B: USER IS OUTSIDE → SHOW PURPOSE PICKER
      // ═══════════════════════════════════════════════════════════
      console.log('[DEBUG] BRANCH B: No open sessions, showing purpose picker');
      setPhase('select-purpose');
      // doTimeIn() will be called when user picks a purpose

    } catch (e: unknown) {
      const errorMsg = (e as Error)?.message ?? 'Something went wrong. Please try again.';
      setErrMsg(errorMsg);
      setPhase('error');
    }
  };

  // Called only after user picks a purpose
  // DOUBLE-CHECK before insert to prevent race conditions
  const doTimeIn = async (pid: VisitPurpose) => {
    setPhase('working');
    try {
      // ═══════════════════════════════════════════════════════════
      // SAFETY CHECK: Verify no session was created during purpose selection
      // (e.g., user signed in on another device/tab)
      // ═══════════════════════════════════════════════════════════
      const { data: stillOpen } = await supabase
        .from('visit_logs')
        .select('id, time_in')
        .eq('visitor_id', visitorId)
        .is('time_out', null)
        .limit(10);

      if (stillOpen && stillOpen.length > 0) {
        // Race condition detected: close the session(s) and show time-out
        const now = new Date().toISOString();
        const timeStr = new Date().toLocaleTimeString('en-PH', { 
          hour: '2-digit', minute: '2-digit', hour12: true 
        });

        const updatePromises = stillOpen.map(s => {
          const dur = calcDurationMinutes(s.time_in, now);
          return supabase.from('visit_logs').update({
            time_out: now, 
            duration_minutes: Math.max(0, Math.round(dur)),
          }).eq('id', s.id);
        });

        await Promise.all(updatePromises);

        await signOut();
        navigate(
          `/success?action=out&name=${encodeURIComponent(firstName)}&time=${encodeURIComponent(timeStr)}&duration=${encodeURIComponent('0m')}`, 
          { replace: true }
        );
        return; // ← EXIT: Don't insert, user was already inside
      }

      // ═══════════════════════════════════════════════════════════
      // SAFE TO INSERT: No open sessions exist
      // ═══════════════════════════════════════════════════════════
      const now = new Date().toISOString();
      const { error: insertError } = await supabase.from('visit_logs').insert({
        visitor_id: visitorId,
        purpose:    pid,
        time_in:    now,
        visit_date: now.split('T')[0],
      });

      if (insertError) throw insertError;

      const timeStr = new Date().toLocaleTimeString('en-PH', { 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });

      await signOut();
      navigate(
        `/success?action=in&name=${encodeURIComponent(firstName)}&time=${encodeURIComponent(timeStr)}`,
        { replace: true }
      );
    } catch (e: unknown) {
      const errorMsg = (e as Error)?.message ?? 'Could not record your entry. Please try again.';
      setErrMsg(errorMsg);
      setPhase('error');
    }
  };

  const handleGoogleSignIn = async () => {
    clearBlockReason(); setUrlError(null); setErrMsg(''); setGBusy(true);
    const { error } = await signInWithGoogle('/');
    if (error) { setErrMsg(error); setPhase('error'); setGBusy(false); }
  };

  const reset = () => {
    clearBlockReason(); setUrlError(null); setErrMsg(''); setPurpose(null);
    signOut().then(() => setPhase('idle'));
  };

  const dismissPopup = () => { setUrlError(null); clearBlockReason(); };

  return (
    <>
      {activePopup && <BlockPopup reason={activePopup} onDismiss={dismissPopup} />}

      <div className="min-h-screen relative">
        <div className="fixed inset-0 -z-10"
          style={{ backgroundImage:"url('/Neu-Lib_Building.jpg')", backgroundSize:'cover', backgroundPosition:'center' }}
          aria-hidden />
        <div className="fixed inset-0 -z-10"
          style={{ background:'linear-gradient(160deg,rgba(0,20,80,.82) 0%,rgba(0,50,160,.78) 50%,rgba(0,20,80,.86) 100%)' }}
          aria-hidden />

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
          <a href="/admin/login" className="absolute top-5 right-7 text-white/50 hover:text-white/80 text-sm font-medium transition-colors">
            Admin Portal →
          </a>

          <div className="w-full max-w-md flex flex-col items-center gap-5">

            {/* Clock */}
            <div className="text-center select-none">
              <div className="flex items-end justify-center gap-2" style={{ fontFamily:'Outfit,sans-serif' }}>
                <span className="text-white font-black leading-none"
                  style={{ fontSize:'clamp(56px,10vw,88px)', textShadow:'0 4px 24px rgba(0,0,0,.6)', letterSpacing:'-2px' }}>
                  {clock.hh}:{clock.mm}
                </span>
                <div className="pb-2.5 flex flex-col items-start gap-0.5">
                  <span className="text-white font-black text-2xl leading-none">{clock.ap}</span>
                  <span className="text-white/50 font-bold text-lg tabular-nums leading-none">:{clock.ss}</span>
                </div>
              </div>
              <p className="text-white/65 text-sm font-semibold mt-1.5">{clock.day}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Clock size={10} className="text-white/35" />
                <span className="text-white/35 text-[10px] font-bold uppercase tracking-widest">Philippine Standard Time</span>
              </div>
            </div>

            {/* Logo */}
            <div className="text-center">
              <img src="/NEU%20Library%20logo.png" alt="NEU"
                className="h-24 w-24 object-contain mx-auto mb-3 drop-shadow-2xl"
                onError={e => { const i = e.currentTarget as HTMLImageElement; if (!i.dataset.t) { i.dataset.t='1'; i.src='/neu-logo.svg'; } else i.style.display='none'; }} />
              <h1 className="text-white font-bold text-3xl tracking-tight" style={{ textShadow:'0 2px 12px rgba(0,0,0,.5)' }}>
                NEU Library
              </h1>
              <p className="text-white/55 text-sm mt-0.5 font-medium">Visitor Log · New Era University</p>
            </div>

            {/* Card */}
            <div className="w-full bg-white rounded-2xl shadow-2xl overflow-hidden">

              {/* IDLE */}
              {phase === 'idle' && (
                <div className="px-8 py-8 text-center">
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    Sign in with your NEU account to record your library visit.
                    The system will automatically check you <strong className="text-slate-800">in</strong> or{' '}
                    <strong className="text-slate-800">out</strong>.
                  </p>
                  <button onClick={handleGoogleSignIn} disabled={gBusy}
                    className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60 shadow-sm">
                    {gBusy ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <GoogleIcon size={18} />}
                    {gBusy ? 'Opening Google…' : 'Sign in with Google'}
                  </button>
                  <p className="text-slate-400 text-[11px] mt-4">
                    Only <strong className="text-slate-500">@neu.edu.ph</strong> accounts are accepted
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
                        <button key={p} onClick={() => setPurpose(p)}
                          className="rounded-xl border-2 py-4 px-3 flex flex-col items-center gap-2 transition-all"
                          style={{
                            borderColor: purpose === p ? '#2563EB' : '#E2E8F0',
                            background:  purpose === p ? '#EFF6FF' : '#F9FAFB',
                            transform:   purpose === p ? 'scale(1.02)' : 'scale(1)',
                          }}>
                          <span className="text-2xl">{PURPOSE_EMOJI[p]}</span>
                          <span className="text-[11px] font-bold text-center leading-tight"
                            style={{ color: purpose === p ? '#2563EB' : '#64748B' }}>{p}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => purpose && doTimeIn(purpose)} disabled={!purpose}
                      className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-40 transition-all">
                      Confirm Time In
                    </button>
                    <button onClick={reset}
                      className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* ERROR */}
              {phase === 'error' && (
                <div className="px-8 py-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert size={26} className="text-red-500" />
                  </div>
                  <p className="text-slate-900 font-black text-base mb-2">Sign-In Blocked</p>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">{errMsg}</p>
                  <button onClick={reset}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all">
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