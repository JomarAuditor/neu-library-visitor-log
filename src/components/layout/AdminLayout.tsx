// src/components/layout/AdminLayout.tsx
// World-class enterprise admin route protection with multi-layer authorization
import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AdminSidebar }          from './AdminSidebar';
import { useAuth, checkIsAdmin } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { ShieldX, ArrowLeft } from 'lucide-react';

// Unauthorized Admin Popup
function UnauthorizedAdminPopup({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        background: 'rgba(0,0,0,0.85)', 
        backdropFilter: 'blur(10px)',
        zIndex: 99999
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Red Header */}
        <div className="bg-red-600 px-6 pt-6 pb-5 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <ShieldX size={32} className="text-white" />
          </div>
          <h2 className="text-white font-black text-xl tracking-tight">Only authorized admin</h2>
          <p className="text-white/80 text-sm mt-1 font-medium">Admin privileges required</p>
        </div>

        {/* White Body */}
        <div className="bg-white px-6 py-6 text-center">
          <div className="mb-4">
            <p className="text-slate-500 text-xs mb-1">Attempted email:</p>
            <p className="text-slate-800 font-bold text-sm truncate px-3 py-2 bg-slate-50 rounded-lg border">
              {email}
            </p>
          </div>
          
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            This area is restricted to authorized administrators only.
          </p>

          <p className="text-slate-400 text-xs leading-relaxed mb-6">
            Contact: <strong className="text-slate-600">jomar.auditor@neu.edu.ph</strong>
          </p>

          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all"
          >
            <ArrowLeft size={15} /> Return to Visitor Portal
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.85) translateY(20px); opacity: 0; }
          to   { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// WORLD-CLASS SECURITY: Enterprise admin route guard
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Check authorization and show popup if unauthorized
  useEffect(() => {
    if (!loading && user && user.email && !checkIsAdmin(user.email)) {
      setShowUnauthorized(true);
    }
  }, [user, loading]);

  // CRITICAL: Check if admin access was revoked (profile deleted)
  useEffect(() => {
    if (!loading && user && user.email && checkIsAdmin(user.email)) {
      setCheckingAccess(true);
      
      // Check if profile still exists
      supabase
        .from('profiles')
        .select('id, role')
        .eq('email', user.email.toLowerCase())
        .maybeSingle()
        .then(({ data, error }) => {
          setCheckingAccess(false);
          
          if (error || !data) {
            // Profile deleted - admin access revoked
            console.warn('Admin access revoked for:', user.email);
            signOut().then(() => {
              navigate('/admin/login', { replace: true });
            });
          } else if (!['admin', 'staff'].includes(data.role)) {
            // Role changed - no longer admin
            console.warn('Admin role removed for:', user.email);
            signOut().then(() => {
              navigate('/admin/login', { replace: true });
            });
          }
        });
    }
  }, [user, loading, signOut, navigate]);

  // SECURITY LAYER 1: Not authenticated - redirect to login
  if (!user) return <Navigate to="/admin/login" replace />;

  // SECURITY LAYER 2: Hard-coded admin whitelist validation with popup
  if (user && user.email && !checkIsAdmin(user.email)) {
    return (
      <>
        {/* Background blur */}
        <div className="min-h-screen bg-slate-100" />
        {/* Popup */}
        {showUnauthorized && (
          <UnauthorizedAdminPopup
            email={user.email || 'Unknown'}
            onBack={() => navigate('/', { replace: true })}
          />
        )}
      </>
    );
  }

  // SECURITY LAYER 3: Profile validation
  if (!profile) return <Navigate to="/admin/login" replace />;

  // SECURITY LAYER 4: Role-based access control
  if (!['admin', 'staff'].includes(profile.role)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚠</span>
            </div>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Only authorized admin</h2>
          <p className="text-slate-600 text-sm mb-6">
            Your account does not have the required administrative privileges.
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="px-6 py-3 bg-neu-blue hover:bg-neu-navy text-white font-bold rounded-xl transition-all"
          >
            Return to Visitor Portal
          </button>
        </div>
      </div>
    );
  }

  // Secure admin interface
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}