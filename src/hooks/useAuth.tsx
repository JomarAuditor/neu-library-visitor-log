// =====================================================================
// NEU Library — Authentication Context
// File: src/hooks/useAuth.tsx
// =====================================================================
// CHANGES:
//   + signInWithGoogle(redirectPath) — Google OAuth sign-in
//   + profileReady — true once profile fetch completes (even if null)
//   + isAdmin — true if profile.role is 'admin' or 'staff'
//   + Regular visitors (no profile) — can still use visitor portal
// =====================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';

interface Ctx {
  session:          Session | null;
  user:             User | null;
  profile:          Profile | null;
  loading:          boolean;       // true while initial session check runs
  profileReady:     boolean;       // true once profile fetch completes
  isAdmin:          boolean;
  signIn:           (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: string | null }>;
  signOut:          () => Promise<void>;
}

const AuthContext = createContext<Ctx>({} as Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,      setSession]      = useState<Session | null>(null);
  const [user,         setUser]         = useState<User | null>(null);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  // ── Fetch admin profile (null = no admin record) ──────────────────
  const fetchProfile = async (uid: string): Promise<Profile | null> => {
    setProfileReady(false);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    const prof = data as Profile | null;
    setProfile(prof);
    setProfileReady(true);
    return prof;
  };

  // ── Initial session check ─────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        await fetchProfile(s.user.id);
      } else {
        setProfileReady(true);
      }
      setLoading(false);
    });

    // Listen for auth state changes (fires on Google OAuth callback too)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
          setProfileReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Email + password (admin only) ─────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    });
    if (error) return { error: error.message };

    if (data.user) {
      const prof = await fetchProfile(data.user.id);
      if (!prof || !['admin', 'staff'].includes(prof.role)) {
        await supabase.auth.signOut();
        return { error: 'Access denied. Admin privileges required.' };
      }
    }
    return { error: null };
  };

  // ── Google OAuth ──────────────────────────────────────────────────
  // redirectPath = where to land after Google authenticates
  //   '/admin/login' for admin portal
  //   '/' for visitor portal
  const signInWithGoogle = async (redirectPath = '/') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileReady(false);
  };

  const isAdmin = ['admin', 'staff'].includes(profile?.role ?? '');

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, profileReady,
      isAdmin, signIn, signInWithGoogle, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);