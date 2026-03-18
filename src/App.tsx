import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider }               from '@tanstack/react-query';
import { AuthProvider }                                    from '@/hooks/useAuth';
import { AdminLayout }                                     from '@/components/layout/AdminLayout';

import VisitorHome     from '@/pages/visitor/VisitorHome';
import RegisterPage    from '@/pages/visitor/RegisterPage';
import WelcomePage     from '@/pages/visitor/WelcomePage';
import AdminLogin      from '@/pages/admin/AdminLogin';
import Dashboard       from '@/pages/admin/Dashboard';
import VisitorLogs     from '@/pages/admin/VisitorLogs';
import UserManagement  from '@/pages/admin/UserManagement';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Visitor routes */}
            <Route path="/"         element={<VisitorHome />}  />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/welcome"  element={<WelcomePage />}  />

            {/* Admin login — STANDALONE (never inside AdminLayout) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected admin routes */}
            <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
              <Route index            element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />}      />
              <Route path="logs"      element={<VisitorLogs />}    />
              <Route path="users"     element={<UserManagement />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}