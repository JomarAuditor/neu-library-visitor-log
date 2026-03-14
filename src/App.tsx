// =====================================================================
// NEU Library Visitor Log System
// App Routes
// File: src/App.tsx
// =====================================================================
// FIX: Admin routes now use React Router nested routing with a shared
//      <AdminLayout> outlet. This means the sidebar is rendered ONCE
//      and NEVER remounts or refreshes when navigating between admin
//      pages (Dashboard, Visitor Logs, User Management).
//
//      Before: each admin page imported AdminLayout individually,
//      so React destroyed and recreated the sidebar on every navigation.
//
//      After: AdminLayout renders once as the parent route. Child pages
//      render inside <Outlet /> without touching the sidebar at all.
// =====================================================================

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';

// Visitor pages
import VisitorHome      from '@/pages/visitor/VisitorHome';
import StudentRegister  from '@/pages/visitor/StudentRegister';
import WelcomePage      from '@/pages/visitor/WelcomePage';

// Admin pages
import AdminLogin       from '@/pages/admin/AdminLogin';
import Dashboard        from '@/pages/admin/Dashboard';
import VisitorLogs      from '@/pages/admin/VisitorLogs';
import UserManagement   from '@/pages/admin/UserManagement';

// Shared admin layout (sidebar + content wrapper)
import { AdminLayout }  from '@/components/layout/AdminLayout';

// 404 page
function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neu-gray gap-3">
      <p className="text-6xl font-bold text-neu-blue">404</p>
      <p className="text-slate-400 font-medium">Page not found</p>
      <a href="/" className="text-neu-blue font-semibold hover:underline text-sm">
        Back to home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* ── Public visitor routes ── */}
          <Route path="/"          element={<VisitorHome />}     />
          <Route path="/register"  element={<StudentRegister />} />
          <Route path="/welcome"   element={<WelcomePage />}     />

          {/* ── Admin login (public) ── */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* ── Admin protected routes ── */}
          {/* AdminLayout renders ONCE here as the parent.              */}
          {/* The sidebar lives inside AdminLayout and never remounts.  */}
          {/* Each child page renders inside <Outlet /> in AdminLayout. */}
          <Route
            path="/admin"
            element={<AdminLayout><Outlet /></AdminLayout>}
          >
            {/* /admin → redirect to /admin/dashboard */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />

            {/* These render inside the persistent AdminLayout */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="logs"      element={<VisitorLogs />} />
            <Route path="users"     element={<UserManagement />} />
          </Route>

          {/* ── 404 fallback ── */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}