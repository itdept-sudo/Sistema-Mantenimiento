import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_ITAM_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_ITAM_SUPABASE_ANON_KEY;

// Instancia de solo lectura hacia ITAM Desk
export const itamSupabase = createClient(supabaseUrl, supabaseAnonKey);
