import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL eta VITE_SUPABASE_ANON_KEY definitu behar dira .env.local fitxategian.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use an app-specific storage key to avoid stale tokens from old builds.
    storageKey: 'hiztegia-auth-v2',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Public read-only client. It never adopts end-user sessions, so queries
// always run with the anon role policies.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
