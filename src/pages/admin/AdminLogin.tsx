// src/pages/admin/AdminLogin.tsx
import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth }    from '@/hooks/useAuth';
import { supabase }   from '@/lib/supabase';
import { isNEUEmail } from '@/lib/utils';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

const AUTHORIZED_ADMINS = [
  'jcesperanza@neu.edu.ph',
  'jomar.auditor@neu.edu.ph',
  'jan-neo.gloria@neu.edu.ph',
];

export default function AdminLogin() {
  const { signInWithGoogle, user, profile, loading, profileReady, signOut } = useAuth();
  const navigate = useNavigate();
  const [email,  setEmail]  = useState('');
  const [pw,     setPw]     = useState('');
  const [show,   setShow]   = useState(false);
  const [busy,   setBusy]   = useState(false);
  const [gBusy,  setGBusy]  = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (loading || !profileReady) return;
    if (!user) return;
    const emailLower = user.email?.toLowerCase() ?? '';
    if (profile && ['admin','staff'].includes(profile.role) && AUTHORIZED_ADMINS.includes(emailLower)) {
      navigate('/admin/dashboard', { replace: true });
    } else if (profileReady && user && (!profile || !AUTHORIZED_ADMINS.includes(emailLower))) {
      setError(`${user.email} is not authorized to access this portal.`);
      signOut();
    }
  }, [loading, profileReady, user, profile, navigate, signOut]);

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!isNEUEmail(email)) { setError('Only @neu.edu.ph email addresses are allowed.'); return; }
    if (!AUTHORIZED_ADMINS.includes(email.trim().toLowerCase())) { setError('This account does not have admin access.'); return; }
    setBusy(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (authErr) setError(authErr.message);
    } catch (e: unknown) { setError((e as Error)?.message ?? 'Sign in failed.'); }
    finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setError(''); setGBusy(true);
    const { error: err } = await signInWithGoogle('/admin/login');
    if (err) { setError(err); setGBusy(false); }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/Neu-Lib_Building.jpg')" }} aria-hidden />
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, rgba(0,15,60,0.88) 0%, rgba(0,35,110,0.84) 50%, rgba(0,15,60,0.90) 100%)',
      }} aria-hidden />

      <a href="/" className="absolute top-5 left-6 text-white/40 hover:text-white/70 text-xs font-medium transition-colors z-20">← Visitor Portal</a>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-7">
          <img src="/neu-logo.svg" alt="NEU" className="h-16 w-16 object-contain mx-auto mb-3 drop-shadow-xl"
            onError={e => { const i = e.currentTarget as HTMLImageElement; if (!i.dataset.t) { i.dataset.t='1'; i.src='/NEU%20Library%20logo.png'; } else i.style.display='none'; }} />
          <h1 className="text-white font-black text-[22px]" style={{ fontFamily: 'Outfit, sans-serif' }}>NEU Library</h1>
          <p className="text-white/50 text-sm">Administrator Portal</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100"
            style={{ background: 'rgba(239,246,255,0.7)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #003087, #0050C8)' }}>
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Administrator Sign In</p>
              <p className="text-slate-400 text-[11px]">Authorized personnel only</p>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold leading-relaxed">{error}</div>
            )}

            <button onClick={handleGoogle} disabled={gBusy || busy}
              className="w-full mb-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-200 flex items-center justify-center gap-3 text-sm font-bold text-slate-700 transition-all disabled:opacity-60 shadow-sm">
              {gBusy ? <Loader2 size={16} className="animate-spin text-blue-600" /> : <GoogleIcon />}
              {gBusy ? 'Redirecting to Google…' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-medium">or use email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleEmail} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Email</label>
                <input type="email" className="input" placeholder="admin@neu.edu.ph"
                  value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
                    value={pw} onChange={e => setPw(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy || gBusy}
                className="w-full py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
                style={{ background: 'linear-gradient(135deg, #003087, #0050C8)' }}>
                {busy ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : <>Sign In <ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
        </div>
        <p className="text-center text-white/25 text-[10px] mt-5">© {new Date().getFullYear()} New Era University</p>
      </div>
    </div>
  );
}
