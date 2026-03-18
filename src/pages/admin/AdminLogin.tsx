// src/pages/admin/AdminLogin.tsx
// FIX: Removed "if (loading) return <Loader2>" — that caused the page
//      to show a spinner FOREVER when an old session existed in the browser.
//      Now the form ALWAYS renders immediately. Spinner only on submit button.

import { useState, FormEvent, useEffect } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function AdminLogin() {
  const { signIn, signInWithGoogle, user, profile, loading, profileReady, signOut } = useAuth();
  const navigate = useNavigate();

  const [email,   setEmail]   = useState('');
  const [password,setPassword]= useState('');
  const [show,    setShow]    = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [gBusy,   setGBusy]   = useState(false);
  const [error,   setError]   = useState('');

  // Redirect if already logged in as admin
  useEffect(() => {
    if (loading || !profileReady) return;
    if (!user) return;
    if (profile && ['admin', 'staff'].includes(profile.role)) {
      navigate('/admin/dashboard', { replace: true });
    } else if (profileReady && !profile) {
      setError(
        `No admin access for ${user.email}. ` +
        `Ask your administrator to grant you admin access in the database.`
      );
      signOut();
    }
  }, [loading, profileReady, user, profile, navigate, signOut]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  const handleGoogle = async () => {
    setError('');
    setGBusy(true);
    const { error: err } = await signInWithGoogle('/admin/login');
    if (err) { setError(err); setGBusy(false); }
  };

  // ── NEVER show a full-page spinner here ──────────────────────────
  // The old code had:  if (loading) return <Loader2 />
  // That froze the page forever. Now the form always renders.

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #003087 0%, #001A5E 60%, #0050C8 100%)' }}
    >
      {[...Array(7)].map((_, i) => (
        <div key={i} className="absolute rounded-full border border-white/[0.04]"
          style={{ width: `${130 + i * 90}px`, height: `${130 + i * 90}px`,
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      ))}

      <div className="w-full max-w-md relative animate-scale-in">
        <div className="bg-white rounded-3xl shadow-card-lg overflow-hidden">

          {/* Blue header */}
          <div className="bg-neu-blue px-8 pt-8 pb-10">
            <div className="flex items-center gap-4 mb-6">
              <img src="/NEU%20Library%20logo.png" alt="NEU Library"
                className="h-14 w-14 object-contain"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">New Era University</h1>
                <p className="text-white/60 text-xs tracking-wide">Library Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <ShieldCheck size={16} className="text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Administrator Portal</p>
                <p className="text-white/50 text-xs">Authorized personnel only</p>
              </div>
            </div>
          </div>

          <div className="h-5 bg-white -mt-5 rounded-t-3xl" />

          <div className="px-8 pb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-0.5">Sign In</h2>
            <p className="text-sm text-slate-400 mb-5">Use your Google account or email credentials</p>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium leading-relaxed">
                {error}
              </div>
            )}

            {/* Google button */}
            <button type="button" onClick={handleGoogle} disabled={gBusy || busy}
              className="w-full mb-4 py-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center gap-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-60 shadow-sm">
              {gBusy ? <Loader2 size={17} className="animate-spin text-neu-blue" /> : <GoogleIcon />}
              {gBusy ? 'Redirecting to Google…' : 'Sign in with Google'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">or use email</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" className="input pl-9" placeholder="admin@neu.edu.ph"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={show ? 'text' : 'password'} className="input pl-9 pr-10"
                    placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-3.5" disabled={busy || gBusy}>
                {busy ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-neu-border text-center">
              <a href="/" className="text-xs text-slate-400 hover:text-neu-blue transition-colors">
                Back to Visitor Login
              </a>
            </div>
          </div>
        </div>
        <p className="text-center text-white/30 text-xs mt-5">
          &copy; {new Date().getFullYear()} New Era University &middot; All rights reserved
        </p>
      </div>
    </div>
  );
}