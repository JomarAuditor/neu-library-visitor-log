// src/components/layout/AdminLayout.tsx
// FIX: 6-second safety timeout — never stuck loading forever
// FIX: accepts children prop (App.tsx passes <Outlet /> as children)

import { ReactNode, useEffect, useRef } from 'react';
import { Navigate, useNavigate }        from 'react-router-dom';
import { useAuth }                      from '@/hooks/useAuth';
import { AdminSidebar }                 from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, profile, loading, profileReady } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety: if loading takes more than 6 seconds, force redirect to login
  useEffect(() => {
    if (loading || !profileReady) {
      timerRef.current = setTimeout(() => {
        navigate('/admin/login', { replace: true });
      }, 6000);
    } else {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loading, profileReady, navigate]);

  if (loading || !profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-gray">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neu-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;
  if (profile && profile.role !== 'admin' && profile.role !== 'staff') return <Navigate to="/" replace />;
  if (!profile) return <Navigate to="/admin/login" replace />;

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