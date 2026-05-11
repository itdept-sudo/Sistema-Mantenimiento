import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_ITAM_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_ITAM_SUPABASE_ANON_KEY || 'placeholder';

// Instancia de solo lectura hacia ITAM Desk
export const itamSupabase = createClient(supabaseUrl, supabaseAnonKey);
