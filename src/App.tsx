import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';

import VisitorHome     from '@/pages/visitor/VisitorHome';
import StudentRegister from '@/pages/visitor/StudentRegister';
import WelcomePage     from '@/pages/visitor/WelcomePage';

import AdminLogin      from '@/pages/admin/AdminLogin';
import Dashboard       from '@/pages/admin/Dashboard';
import VisitorLogs     from '@/pages/admin/VisitorLogs';
import UserManagement  from '@/pages/admin/UserManagement';

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neu-gray gap-3">
      <p className="text-6xl font-bold text-neu-blue">404</p>
      <p className="text-slate-400 font-medium">Page not found</p>
      <a href="/" className="text-neu-blue font-semibold hover:underline text-sm">← Back to home</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public visitor routes */}
          <Route path="/"          element={<VisitorHome />} />
          <Route path="/register"  element={<StudentRegister />} />
          <Route path="/welcome"   element={<WelcomePage />} />

          {/* Admin routes */}
          <Route path="/admin"           element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/login"     element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/logs"      element={<VisitorLogs />} />
          <Route path="/admin/users"     element={<UserManagement />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
