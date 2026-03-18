// src/hooks/useAuth.tsx
// SECURITY: Only @neu.edu.ph emails are allowed.
// Non-NEU Google accounts are blocked at the auth state change level.

import {
  createContext, useContext, useEffect,
  useState, useRef, ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase }      from '@/lib/supabase';
import { Profile }       from '@/types';
import { isNEUEmail }    from '@/lib/utils';

// Admin whitelist — these emails are auto-provisioned as admin on first Google login
const ADMIN_EMAILS = [
  'jcesperanza@neu.edu.ph',
  'jomar.auditor@neu.edu.ph',
];

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

async function provisionAdminIfNeeded(user: User): Promise<Profile | null> {
  const email = user.email?.toLowerCase() ?? '';

  // Check existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  // Only create profiles for whitelisted admin emails
  if (!ADMIN_EMAILS.includes(email)) return null;

  const fullName = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? email.split('@')[0];

  const { data } = await supabase
    .from('profiles')
    .upsert({
      id:         user.id,
      email,
      full_name:  fullName,
      role:       'admin',
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id, email, full_name, role, created_at')
    .single();

  return (data as Profile) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,         setUser]         = useState<User    | null>(null);
  const [session,      setSession]      = useState<Session | null>(null);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile = async (u: User): Promise<void> => {
    try {
      // ENFORCE: Only @neu.edu.ph emails allowed
      if (!isNEUEmail(u.email)) {
        // Sign out the non-NEU user immediately
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        return;
      }
      const p = await provisionAdminIfNeeded(u);
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setProfileReady(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    safety.current = setTimeout(() => {
      if (mounted) { setLoading(false); setProfileReady(true); }
    }, 6000);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user).finally(() => { if (mounted) setLoading(false); });
      } else {
        setLoading(false);
        setProfileReady(true);
      }
    });

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
      if (safety.current) clearTimeout(safety.current);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    // Block non-NEU emails at the UI level too
    if (!isNEUEmail(email)) {
      return { error: 'Only @neu.edu.ph email addresses are allowed.' };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (e: any) {
      return { error: e?.message ?? 'Sign in failed.' };
    }
  };

  const signInWithGoogle = async (redirectPath = '/admin/login'): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
          // Note: Google OAuth will allow any Google account to attempt sign-in.
          // Non-NEU accounts are blocked in the onAuthStateChange handler above
          // which signs them out immediately after the OAuth callback.
        },
      });
      return { error: error?.message ?? null };
    } catch (e: any) {
      return { error: e?.message ?? 'Google sign-in failed.' };
    }
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setProfileReady(false);
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

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}