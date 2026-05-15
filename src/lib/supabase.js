import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Cliente Principal (MaintOps Pro)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Cliente ITAM Desk
const itamUrl = process.env.NEXT_PUBLIC_ITAM_SUPABASE_URL;
const itamKey = process.env.NEXT_PUBLIC_ITAM_SUPABASE_ANON_KEY;

export const itamSupabase = (itamUrl && itamKey)
  ? createClient(itamUrl, itamKey)
  : null;

if (!supabase) {
  console.error("SUPABASE_URL o ANON_KEY faltantes. Verifica tu archivo .env.local o variables en Vercel.");
}
