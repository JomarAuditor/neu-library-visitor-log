import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useNavigate }        from 'react-router-dom';
import { Loader2 }                      from 'lucide-react';
import { AdminSidebar }                 from './AdminSidebar';
import { useAuth }                      from '@/hooks/useAuth';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading, profileReady } = useAuth();
  const navigate = useNavigate();
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety: redirect to login after 6s if still loading
  useEffect(() => {
    if (loading || !profileReady) {
      timer.current = setTimeout(() => navigate('/admin/login', { replace: true }), 6000);
    } else {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [loading, profileReady, navigate]);

  if (loading || !profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-gray">
        <div className="text-center">
          <Loader2 size={26} className="animate-spin text-neu-blue mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user)    return <Navigate to="/admin/login" replace />;
  if (!profile) return <Navigate to="/admin/login" replace />;
  if (profile.role !== 'admin' && profile.role !== 'staff') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-neu-gray flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}