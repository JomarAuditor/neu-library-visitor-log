/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // add other VITE_ env vars as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
