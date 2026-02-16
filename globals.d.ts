declare module '*.svg' {
  const src: string;
  export default src;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.1' {
  export const createClient: (...args: any[]) => any;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
