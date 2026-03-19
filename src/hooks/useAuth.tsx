// src/hooks/useAuth.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase }      from '@/lib/supabase';
import { Profile }       from '@/types';
import { isNEUEmail }    from '@/lib/utils';

// ── Authorized admin emails ───────────────────────────────────────────
const ADMIN_EMAILS = [
  'jcesperanza@neu.edu.ph',
  'jomar.auditor@neu.edu.ph',
  'jan-neo.gloria@neu.edu.ph',
  'rene.espina@neu.edu.ph',
  'trixianwackyll.granado@neu.edu.ph',
];

interface AuthCtx {
  user:             User    | null;
  session:          Session | null;
  profile:          Profile | null;
  loading:          boolean;
  profileReady:     boolean;
  isAdmin:          boolean;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: string | null }>;
  signOut:          ()                      => Promise<void>;
  refreshProfile:   ()                      => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

async function fetchOrProvisionProfile(user: User): Promise<Profile | null> {
  const email = user.email?.toLowerCase() ?? '';

  const { data } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (data) return data as Profile;

  if (!ADMIN_EMAILS.includes(email)) return null;

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    email.split('@')[0];

  const { data: created } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email, full_name: fullName, role: 'admin' }, { onConflict: 'id' })
    .select('id,email,full_name,role,created_at')
    .single();

  return (created as Profile) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,         setUser]         = useState<User    | null>(null);
  const [session,      setSession]      = useState<Session | null>(null);
  const [profile,      setProfile]      = useState<Profile | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  const handleUser = async (u: User | null, mounted: { v: boolean }) => {
    if (!u) {
      setUser(null); setSession(null); setProfile(null);
      setLoading(false); setProfileReady(true);
      return;
    }

    if (!isNEUEmail(u.email)) {
      await supabase.auth.signOut();
      setUser(null); setSession(null); setProfile(null);
      setLoading(false); setProfileReady(true);
      return;
    }

    if (!mounted.v) return;
    setUser(u);

    try {
      const p = await fetchOrProvisionProfile(u);
      if (mounted.v) setProfile(p);
    } catch {
      if (mounted.v) setProfile(null);
    } finally {
      if (mounted.v) { setLoading(false); setProfileReady(true); }
    }
  };

  useEffect(() => {
    const mounted = { v: true };

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted.v) return;
      setSession(s);
      handleUser(s?.user ?? null, mounted);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted.v) return;
      setSession(s);
      // Do NOT set loading=true here — this is the fix for tab-switch logout
      handleUser(s?.user ?? null, mounted);
    });

    return () => { mounted.v = false; subscription.unsubscribe(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async (redirectPath = '/admin/login'): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      return { error: error?.message ?? null };
    } catch (e: unknown) {
      return { error: (e as Error)?.message ?? 'Google sign-in failed.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setProfileReady(false);
  };

  const refreshProfile = async () => {
    if (user) await handleUser(user, { v: true });
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading, profileReady,
      isAdmin: ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? '') && !!profile,
      signInWithGoogle, signOut, refreshProfile,
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
