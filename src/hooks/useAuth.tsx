// =====================================================================
// NEU Library — Auth Hook
// File: src/hooks/useAuth.tsx
//
// KEY FEATURES:
//   - Auto-provisions admin profiles for whitelisted emails on first login
//   - No manual SQL needed — professor just signs in with Google
//   - Safety timeout prevents infinite loading
//   - Exports signIn, signInWithGoogle, signOut, refreshProfile
//   - profileReady flag so UI knows when loading is truly done
// =====================================================================

import {
  createContext, useContext, useEffect,
  useState, useRef, ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase }      from '@/lib/supabase';
import { Profile }       from '@/types';

// ── Admin email whitelist ─────────────────────────────────────────────
// These emails automatically get admin role on first Google sign-in.
// No manual SQL needed. Add any email here to grant admin access.
const ADMIN_EMAILS: string[] = [
  'jcesperanza@neu.edu.ph',    // Professor — admin access
  'jomar.auditor@neu.edu.ph',  // Developer test account — admin access
];

// ──────────────────────────────────────────────────────────────────────
// Context interface
// ──────────────────────────────────────────────────────────────────────
interface AuthCtx {
  user:         User    | null;
  session:      Session | null;
  profile:      Profile | null;
  loading:      boolean;
  profileReady: boolean;
  isAdmin:      boolean;

  signIn:           (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirectPath?: string)           => Promise<{ error: string | null }>;
  signOut:          ()                                => Promise<void>;
  refreshProfile:   ()                                => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

// ──────────────────────────────────────────────────────────────────────
// Auto-provision profile for whitelisted emails
// Called automatically after Google sign-in — no manual SQL needed
// ──────────────────────────────────────────────────────────────────────
async function autoProvisionProfile(user: User): Promise<Profile | null> {
  const email = user.email?.toLowerCase() ?? '';

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  // Only create profiles for whitelisted admin emails
  if (!ADMIN_EMAILS.includes(email)) return null;

  // Auto-create admin profile
  const fullName = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? email.split('@')[0];

  const { data: created, error } = await supabase
    .from('profiles')
    .upsert({
      id:         user.id,
      email:      email,
      full_name:  fullName,
      role:       'admin',
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id, email, full_name, role, created_at')
    .single();

  if (error) {
    console.error('[Auth] Auto-provision failed:', error.message);
    return null;
  }

  return created as Profile;
}

// ──────────────────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,         setUser]         = useState<User    | null>(null);
  const [session,      setSession]      = useState<Session | null>(null);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch + auto-provision profile ──────────────────────────────────
  const loadProfile = async (u: User): Promise<void> => {
    try {
      // First try to get existing profile
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('id', u.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
        setProfileReady(true);
        return;
      }

      // No profile — try auto-provisioning (for whitelisted emails)
      const provisioned = await autoProvisionProfile(u);
      setProfile(provisioned);
    } catch (err) {
      console.error('[Auth] loadProfile error:', err);
      setProfile(null);
    } finally {
      setProfileReady(true);
    }
  };

  // ── Listen to Supabase auth changes ─────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // 6-second safety timer — never stay stuck loading
    safetyTimer.current = setTimeout(() => {
      if (mounted) { setLoading(false); setProfileReady(true); }
    }, 6000);

    // Get current session (handles OAuth redirect-back)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
        setProfileReady(true);
      }
    });

    // Subscribe to future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          setProfileReady(false);
          await loadProfile(s.user);
        } else {
          setProfile(null);
          setProfileReady(true);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
    };
  }, []);

  // ── Email + password sign-in ─────────────────────────────────────────
  const signIn = async (
    email: string, password: string,
  ): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e?.message ?? 'Sign in failed.' };
    }
  };

  // ── Google OAuth ─────────────────────────────────────────────────────
  // Uses window.location.origin so localhost stays on localhost
  const signInWithGoogle = async (
    redirectPath = '/admin/login',
  ): Promise<{ error: string | null }> => {
    try {
      const redirectTo = `${window.location.origin}${redirectPath}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      return { error: e?.message ?? 'Google sign-in failed.' };
    }
  };

  // ── Sign out ─────────────────────────────────────────────────────────
  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileReady(false);
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, profileReady,
      isAdmin: profile?.role === 'admin' || profile?.role === 'staff',
      signIn, signInWithGoogle, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}