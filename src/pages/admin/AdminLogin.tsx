// src/pages/admin/AdminLogin.tsx
// - Confidential admin emails REMOVED from UI
// - Google sign-in ONLY (no email/password form)
// - Unauthorized popup for non-admin NEU emails
import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { Loader2, ShieldCheck, ShieldX, ArrowLeft } from 'lucide-react';
import { useAuth, checkIsAdmin } from '@/hooks/useAuth';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function UnauthorizedPopup({ email, onClose }: { email: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'scaleIn .2s ease-out' }}>
        <div className="bg-red-600 px-6 pt-7 pb-5 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <ShieldX size={32} className="text-white" />
          </div>
          <h2 className="text-white font-black text-xl mb-1">Unauthorized</h2>
          <p className="text-white/80 text-sm font-medium">This area is for Authorized Admins only.</p>
        </div>
        <div className="bg-white px-6 py-5 text-center">
          <p className="text-slate-500 text-xs mb-1">Attempted access from:</p>
          <p className="text-slate-800 font-bold text-sm truncate mb-4 max-w-xs mx-auto">{email}</p>
          <p className="text-slate-400 text-xs leading-relaxed mb-5">
            This account does not have administrator privileges. Please contact your library administrator for assistance.
          </p>
          <button onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all">
            <ArrowLeft size={15} /> Return to Visitor Portal
          </button>
        </div>
      </div>
      <style>{`@keyframes scaleIn{from{transform:scale(.88);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const { signInWithGoogle, user, profile, loading, profileReady, signOut } = useAuth();
  const [gBusy,       setGBusy]       = useState(false);
  const [error,       setError]       = useState('');
  const [showUnauth,  setShowUnauth]  = useState(false);
  const [unauthEmail, setUnauthEmail] = useState('');

  useEffect(() => {
    if (loading || !profileReady) return;
    if (!user) return;
    const el = (user.email ?? '').toLowerCase().trim();
    if (profile && ['admin','staff'].includes(profile.role) && checkIsAdmin(el)) {
      navigate('/admin/dashboard', { replace: true });
    } else if (!checkIsAdmin(el)) {
      setUnauthEmail(user.email ?? '');
      setShowUnauth(true);
      signOut();
    }
  }, [loading, profileReady, user, profile, navigate, signOut]);

  const handleGoogle = async () => {
    setError(''); setGBusy(true);
    const { error: err } = await signInWithGoogle('/admin/login');
    if (err) { setError(err); setGBusy(false); }
  };

  return (
    <>
      {showUnauth && (
        <UnauthorizedPopup
          email={unauthEmail}
          onClose={() => { setShowUnauth(false); navigate('/', { replace: true }); }}
        />
      )}

      <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
        style={{ backgroundImage:"url('/Neu-Lib_Building.jpg')", backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed' }}>
        <div className="absolute inset-0" style={{ background:'linear-gradient(160deg,rgba(0,15,60,.88) 0%,rgba(0,35,110,.84) 50%,rgba(0,15,60,.90) 100%)' }} aria-hidden />

        <a href="/" className="absolute top-5 left-6 text-white/40 hover:text-white/70 text-xs font-medium transition-colors z-20">
          ← Visitor Portal
        </a>

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-7">
            <img src="/NEU%20Library%20logo.png" alt="NEU"
              className="h-20 w-20 object-contain mx-auto mb-3 drop-shadow-2xl"
              onError={e => { const i = e.currentTarget as HTMLImageElement; if (!i.dataset.t) { i.dataset.t='1'; i.src='/neu-logo.svg'; } else i.style.display='none'; }} />
            <h1 className="text-white font-black text-2xl" style={{ fontFamily:'Outfit,sans-serif' }}>NEU Library</h1>
            <p className="text-white/50 text-sm mt-0.5">Administrator Portal</p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100" style={{ background:'rgba(239,246,255,.8)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:'linear-gradient(135deg,#003087,#0050C8)' }}>
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                {/* NO email list — confidential */}
                <p className="font-black text-slate-800 text-sm">Authorized Personnel Only</p>
                <p className="text-slate-400 text-[11px]">NEU Library Administration</p>
              </div>
            </div>

            <div className="px-6 py-6">
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold">{error}</div>
              )}
              <p className="text-slate-500 text-sm text-center mb-5 leading-relaxed">
                Sign in with your authorized NEU Google account to access the administrator dashboard.
              </p>
              <button onClick={handleGoogle} disabled={gBusy}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-sm font-bold text-slate-700 transition-all disabled:opacity-60 shadow-sm">
                {gBusy ? <Loader2 size={18} className="animate-spin text-blue-600" /> : <GoogleIcon />}
                {gBusy ? 'Redirecting to Google…' : 'Continue with Google'}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-4">
                Only authorized <strong>@neu.edu.ph</strong> accounts are permitted
              </p>
            </div>
          </div>
          <p className="text-center text-white/25 text-[10px] mt-5">© {new Date().getFullYear()} New Era University</p>
        </div>
      </div>
    </>
  );
}