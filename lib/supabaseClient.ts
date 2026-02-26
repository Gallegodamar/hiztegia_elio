import { supabase, supabasePublic } from '../supabase';

// Reuse the existing app-level Supabase configuration (.env local vars are
// already validated in `supabase.ts`).
export const supabaseClient = supabasePublic;
export const supabaseAuthClient = supabase;
