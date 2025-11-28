import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QueryLog {
  id: string;
  portal: string;
  query: string;
  filters: Record<string, any>;
  result_count: number;
  execution_time_ms: number;
  error_message: string | null;
  created_at: string;
  user_identifier: string | null;
}
