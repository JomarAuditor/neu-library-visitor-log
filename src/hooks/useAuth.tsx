// src/hooks/useAuth.tsx
// World-class enterprise authentication with multi-layered security
import {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase }       from '@/lib/supabase';
import { Profile }        from '@/types';
import { AuthModal }      from '@/components/auth/AuthModal';
import { sanitizeEmail }  from '@/lib/security';

// WORLD-CLASS SECURITY: Hard-coded NEU email validation
export const isNEUEmail = (e?: string | null): boolean => {
  if (!e || typeof e !== 'string') return false;
  const sanitized = sanitizeEmail(e);
  if (!sanitized) return false;
  return sanitized.endsWith('@neu.edu.ph');
};

// WORLD-CLASS SECURITY: Hard-coded authorized admin list
export const SUPER_ADMIN_EMAIL = 'jomar.auditor@neu.edu.ph' as const;
export const ADMIN_EMAILS: readonly string[] = [
  SUPER_ADMIN_EMAIL,
  'jcesperanza@neu.edu.ph',
  'rene.espina@neu.edu.ph',
] as const;

export const checkIsAdmin = (e?: string | null): boolean => {
  if (!e || typeof e !== 'string') return false;
  const sanitized = sanitizeEmail(e);
  if (!sanitized) return false;
  return ADMIN_EMAILS.includes(sanitized);
};

export const checkIsSuperAdmin = (e?: string | null): boolean => {
  if (!e || typeof e !== 'string') return false;
  const sanitized = sanitizeEmail(e);
  return sanitized === SUPER_ADMIN_EMAIL;
};

// ── sessionStorage: survives OAuth full-page redirect ─────────────────
const BLOCK_KEY  = 'neu_block_reason';
const writeBlock = (m: string) => { try { sessionStorage.setItem(BLOCK_KEY, m); } catch { /**/ } };
const readBlock  = (): string | null => { try { return sessionStorage.getItem(BLOCK_KEY); } catch { return null; } };
const clearBlock = () => { try { sessionStorage.removeItem(BLOCK_KEY); } catch { /**/ } };

interface AuthCtx {
  user:             User    | null;
  session:          Session | null;
  profile:          Profile | null;
  loading:          boolean;
  profileReady:     boolean;
  isAdmin:          boolean;
  isSuperAdmin:     boolean;
  blockReason:      string | null;
  authModal:        { type: 'email-denied' | 'unauthorized' | 'blocked'; email?: string; message?: string } | null;
  clearBlockReason: () => void;
  clearAuthModal:   () => void;
  signInWithGoogle: (path?: string) => Promise<{ error: string | null }>;
  signOut:          () => Promise<void>;
  refreshProfile:   () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

async function provisionProfile(user: User): Promise<Profile | null> {
  const email = (user.email ?? '').toLowerCase().trim();
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (data) return data as Profile;
  if (!checkIsAdmin(email)) return null;
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? email.split('@')[0];
  const { data: c } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email, full_name: name, role: 'admin' }, { onConflict: 'id' })
    .select('id, email, full_name, role, created_at')
    .single();
  return (c as Profile) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,         setUser]        = useState<User    | null>(null);
  const [session,      setSession]     = useState<Session | null>(null);
  const [profile,      setProfile]     = useState<Profile | null>(null);
  const [loading,      setLoading]     = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  // Read from sessionStorage on first render — survives OAuth redirect
  const [blockReason, setBlockReason]  = useState<string | null>(readBlock);
  const [authModal, setAuthModal] = useState<{ type: 'email-denied' | 'unauthorized' | 'blocked'; email?: string; message?: string } | null>(null);

  const clearBlockReason = useCallback(() => { clearBlock(); setBlockReason(null); }, []);
  const clearAuthModal = useCallback(() => { setAuthModal(null); }, []);
  const block = useCallback((msg: string) => { writeBlock(msg); setBlockReason(msg); }, []);
  const showAuthModal = useCallback((type: 'email-denied' | 'unauthorized' | 'blocked', email?: string, message?: string) => {
    setAuthModal({ type, email, message });
  }, []);

  const wipe = useCallback((m: { v: boolean }) => {
    if (!m.v) return;
    setUser(null); setSession(null); setProfile(null);
    setLoading(false); setProfileReady(true);
  }, []);

  const handle = useCallback(async (u: User | null, m: { v: boolean }) => {
    if (!u) { wipe(m); return; }

    // WORLD-CLASS SECURITY GATE 1: Strict NEU email domain validation
    // This is the first and most critical security layer - hard-coded validation
    if (!isNEUEmail(u.email)) {
      const email = sanitizeEmail(u.email) || 'Unknown';
      block('Only @neu.edu.ph email is accepted.');
      showAuthModal('email-denied', email, 'Only @neu.edu.ph email is accepted.');
      // Immediately terminate session before any data exposure
      await supabase.auth.signOut();
      wipe(m);
      return;
    }

    // WORLD-CLASS SECURITY GATE 2: Check for blocked visitors
    // Only applies to non-admin users
    if (!checkIsAdmin(u.email)) {
      const sanitized = sanitizeEmail(u.email);
      if (!sanitized) {
        block('Invalid email format.');
        await supabase.auth.signOut();
        wipe(m);
        return;
      }
      
      const { data } = await supabase
        .from('visitors')
        .select('is_blocked')
        .eq('email', sanitized)
        .maybeSingle();
      
      if (data?.is_blocked === true) {
        block('Account Suspended: You are currently blocked from library access.');
        showAuthModal('blocked', sanitized, 'Your account has been suspended from library access. Please contact the administrator.');
        await supabase.auth.signOut();
        wipe(m);
        return;
      }
    }

    // WORLD-CLASS SECURITY: All gates passed - clear any stale blocks
    clearBlock();
    if (m.v) setBlockReason(null);
    if (!m.v) return;
    setUser(u);

    // Provision admin profile if authorized
    try {
      const p = await provisionProfile(u);
      if (m.v) setProfile(p);
    } catch {
      if (m.v) setProfile(null);
    } finally {
      if (m.v) { setLoading(false); setProfileReady(true); }
    }
  }, [block, wipe, showAuthModal]);

  useEffect(() => {
    const m = { v: true };
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!m.v) return;
      setSession(s);
      handle(s?.user ?? null, m);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!m.v) return;
      setSession(s);
      handle(s?.user ?? null, m);
    });
    return () => { m.v = false; subscription.unsubscribe(); };
  }, [handle]);

  const signInWithGoogle = useCallback(async (path = '/') => {
    clearBlockReason();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${path}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      return { error: error?.message ?? null };
    } catch (e: unknown) { return { error: (e as Error)?.message ?? 'Failed.' }; }
  }, [clearBlockReason]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null); setSession(null); setProfile(null); setProfileReady(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await handle(user, { v: true });
  }, [user, handle]);

  const el = (user?.email ?? '').toLowerCase().trim();
  return (
    <Ctx.Provider value={{
      user, session, profile, loading, profileReady,
      isAdmin:      checkIsAdmin(el)      && !!profile,
      isSuperAdmin: checkIsSuperAdmin(el) && !!profile,
      blockReason, authModal, clearBlockReason, clearAuthModal,
      signInWithGoogle, signOut, refreshProfile,
    }}>
      {children}
      {authModal && (
        <AuthModal
          type={authModal.type}
          email={authModal.email}
          message={authModal.message}
          onClose={clearAuthModal}
          onBack={authModal.type === 'unauthorized' ? () => window.location.href = '/' : undefined}
        />
      )}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be inside AuthProvider');
  return c;
}