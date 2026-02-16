import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

type RuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

const env = (import.meta.env ?? {}) as RuntimeEnv;

const supabaseUrl =
  env.VITE_SUPABASE_URL ?? 'https://ixomccijzghtghqmqtma.supabase.co';
const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_r1WBXKqC-MUCo3ilFM9Xsg_6v78aqAG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Public read-only client. It never adopts end-user sessions, so queries
// always run with the anon role policies.
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
