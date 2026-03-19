// src/components/layout/AdminLayout.tsx
// Only the 5 authorized admin emails can access the dashboard.
// Tab switching never triggers a logout — loading is true ONLY on first load.
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 }  from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { useAuth }      from '@/hooks/useAuth';

const AUTHORIZED_ADMINS = [
  'jcesperanza@neu.edu.ph',
  'jomar.auditor@neu.edu.ph',
  'jan-neo.gloria@neu.edu.ph',
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();

  // Show spinner only on very first session check (never on tab switch)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-xs text-slate-400 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // Not signed in at all
  if (!user) return <Navigate to="/admin/login" replace />;

  // Signed in but email not in admin whitelist
  const emailLower = user.email?.toLowerCase() ?? '';
  if (!AUTHORIZED_ADMINS.includes(emailLower)) {
    return <Navigate to="/admin/login" replace />;
  }

  // Signed in with authorized email but no profile row yet (edge case)
  if (!profile) return <Navigate to="/admin/login" replace />;

  // Role check
  if (profile.role !== 'admin' && profile.role !== 'staff') {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
