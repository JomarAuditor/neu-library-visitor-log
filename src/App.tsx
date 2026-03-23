// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider }               from '@tanstack/react-query';
import { AuthProvider }    from '@/hooks/useAuth';
import { AdminLayout }     from '@/components/layout/AdminLayout';
import VisitorHome    from '@/pages/visitor/VisitorHome';
import RegisterPage   from '@/pages/visitor/RegisterPage';
import SuccessPage    from '@/pages/visitor/SuccessPage';
import AdminLogin     from '@/pages/admin/AdminLogin';
import Dashboard      from '@/pages/admin/Dashboard';
import VisitorLogs    from '@/pages/admin/VisitorLogs';
import UserManagement from '@/pages/admin/UserManagement';
import PrivacyPolicy  from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry:                1,
      staleTime:            30_000,
      refetchOnWindowFocus: false, // prevents re-fetch (and auth reset) on tab switch
    },
  },
});

// Prefetch colleges + programs at startup — registration form is instant
qc.prefetchQuery({
  queryKey: ['colleges'],
  queryFn: async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('colleges').select('id,name,abbreviation').order('name');
    return data ?? [];
  },
  staleTime: Infinity,
});
qc.prefetchQuery({
  queryKey: ['all-programs'],
  queryFn: async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data } = await supabase.from('programs').select('id,college_id,name,abbreviation').order('name');
    return data ?? [];
  },
  staleTime: Infinity,
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition:   true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            {/* ── Visitor kiosk ── */}
            <Route path="/"        element={<VisitorHome  />} />
            <Route path="/register" element={<RegisterPage />} />
            {/* Dedicated success screen (Time-In / Time-Out result) */}
            <Route path="/success"  element={<SuccessPage  />} />

            {/* ── Legal pages (required for Google OAuth) ── */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms"   element={<TermsOfService />} />

            {/* ── Admin login — standalone ── */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* ── Protected admin routes ── */}
            <Route path="/admin" element={<AdminLayout><Outlet /></AdminLayout>}>
              <Route index            element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />}      />
              <Route path="logs"      element={<VisitorLogs />}    />
              <Route path="users"     element={<UserManagement />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}