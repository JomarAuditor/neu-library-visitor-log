import { createClient } from '@supabase/supabase-js';

// Read Vite env vars (may be undefined during some CI/build environments)
const url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

if (!url || !key) {
  // Avoid throwing during build so deployments without env vars don't fail the build step.
  // Runtime calls to Supabase will still fail until proper env vars are provided.
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase env vars missing: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.\n' +
    'Set them in your environment (e.g., Vercel Environment Variables) for production.'
  );
}

export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 10 } },
});
