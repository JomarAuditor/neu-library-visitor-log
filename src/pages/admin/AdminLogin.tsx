import { useState, FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NEULogo } from '@/components/NEULogo';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
    else navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #003087 0%, #001A5E 60%, #0050C8 100%)' }}>
      {/* Background rings */}
      {[...Array(7)].map((_, i) => (
        <div key={i} className="absolute rounded-full border border-white/[0.04]"
          style={{ width: `${130 + i * 90}px`, height: `${130 + i * 90}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
      ))}

      <div className="w-full max-w-md relative animate-scale-in">
        <div className="bg-white rounded-3xl shadow-card-lg overflow-hidden">
          {/* Blue header */}
          <div className="bg-neu-blue px-8 pt-8 pb-10">
            <div className="flex items-center gap-4 mb-6">
              <NEULogo size={52} />
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

          {/* White wave */}
          <div className="h-5 bg-white -mt-5 rounded-t-3xl" />

          {/* Form */}
          <div className="px-8 pb-8">
            <h2 className="text-lg font-bold text-slate-800 mb-0.5">Sign In</h2>
            <p className="text-sm text-slate-400 mb-6">Enter your admin credentials to continue</p>

            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">{error}</div>}

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
                  <input type={show ? 'text' : 'password'} className="input pl-9 pr-10" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-3.5 mt-1" disabled={loading}>
                {loading ? <><Loader2 size={16} className="animate-spin" />Signing in…</> : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-neu-border text-center">
              <a href="/" className="text-xs text-slate-400 hover:text-neu-blue transition-colors">← Back to Visitor Login</a>
            </div>
          </div>
        </div>
        <p className="text-center text-white/30 text-xs mt-5">© {new Date().getFullYear()} New Era University · All rights reserved</p>
      </div>
    </div>
  );
}
