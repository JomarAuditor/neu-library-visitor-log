import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout({ children }: { children: ReactNode }) {
  const { loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-gray">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-neu-blue" size={34} />
          <p className="text-sm text-slate-400 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-neu-gray flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-5 lg:p-8 min-w-0">
        {children}
      </main>
    </div>
  );
}
