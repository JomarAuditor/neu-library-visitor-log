// src/hooks/useAuthGuard.ts
// Enterprise-grade authentication guard with comprehensive security checks
import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export interface AuthGuardConfig {
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
  blockMessage?: string;
}

export function useAuthGuard(config: AuthGuardConfig = {}) {
  const { 
    user, 
    profile, 
    loading, 
    isAdmin, 
    isSuperAdmin,
    blockReason,
    authModal 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized' | 'blocked'>('loading');

  useEffect(() => {
    if (loading) {
      setAuthStatus('loading');
      return;
    }

    // Check if user is blocked
    if (blockReason || authModal) {
      setAuthStatus('blocked');
      setIsAuthorized(false);
      return;
    }

    // Check if user exists
    if (!user) {
      setAuthStatus('unauthorized');
      setIsAuthorized(false);
      if (config.redirectTo) {
        navigate(config.redirectTo, { replace: true });
      }
      return;
    }

    // Check admin requirements
    if (config.requireAdmin && !isAdmin) {
      setAuthStatus('unauthorized');
      setIsAuthorized(false);
      return;
    }

    // Check super admin requirements
    if (config.requireSuperAdmin && !isSuperAdmin) {
      setAuthStatus('unauthorized');
      setIsAuthorized(false);
      return;
    }

    // Check role-based access
    if (config.allowedRoles && profile) {
      if (!config.allowedRoles.includes(profile.role)) {
        setAuthStatus('unauthorized');
        setIsAuthorized(false);
        return;
      }
    }

    // All checks passed
    setAuthStatus('authorized');
    setIsAuthorized(true);
  }, [
    user, 
    profile, 
    loading, 
    isAdmin, 
    isSuperAdmin, 
    blockReason, 
    authModal,
    config.requireAdmin,
    config.requireSuperAdmin,
    config.allowedRoles,
    config.redirectTo,
    navigate
  ]);

  return {
    isAuthorized,
    authStatus,
    user,
    profile,
    isAdmin,
    isSuperAdmin,
    loading,
    blockReason,
    authModal
  };
}

// Route-specific guards
export function useAdminGuard() {
  return useAuthGuard({
    requireAdmin: true,
    redirectTo: '/admin/login',
    allowedRoles: ['admin', 'staff']
  });
}

export function useSuperAdminGuard() {
  return useAuthGuard({
    requireSuperAdmin: true,
    redirectTo: '/admin/login',
    allowedRoles: ['admin']
  });
}

export function useVisitorGuard() {
  return useAuthGuard({
    redirectTo: '/'
  });
}