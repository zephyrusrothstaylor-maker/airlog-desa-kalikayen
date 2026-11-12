import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://uwntlfrttdwyucmtsdpq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bnRsZnJ0dGR3eXVjbXRzZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNDEwODcsImV4cCI6MjEwOTkxNzA4N30.PlYUsFXHXkSuS4Tk06u9RGdLR4LdDrKc2IszK3ogoug';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('project-id-anda')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
