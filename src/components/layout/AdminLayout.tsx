// =====================================================================
// NEU Library Visitor Log System
// Admin Layout Wrapper
// File: src/components/layout/AdminLayout.tsx
// =====================================================================
// This component wraps all admin pages.
// It renders the sidebar ONCE and keeps it mounted permanently.
// The page content changes inside the right panel only.
//
// Auth guard: if not logged in, redirects to /admin/login.
// =====================================================================

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminSidebar } from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading } = useAuth();

  // Show nothing while auth state is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neu-gray">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neu-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to admin login
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    // Full viewport layout: sidebar on left, content on right
    <div className="min-h-screen bg-neu-gray flex">

      {/* ── Sidebar (rendered ONCE, never remounts on navigation) ── */}
      <AdminSidebar />

      {/* ── Main content area ── */}
      {/* lg:ml-64 offsets the fixed sidebar on desktop */}
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

    </div>
  );
}