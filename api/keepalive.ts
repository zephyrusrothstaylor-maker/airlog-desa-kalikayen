import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_SUPABASE_URL = 'https://uwntlfrttdwyucmtsdpq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bnRsZnJ0dGR3eXVjbXRzZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNDEwODcsImV4cCI6MjEwOTkxNzA4N30.PlYUsFXHXkSuS4Tk06u9RGdLR4LdDrKc2IszK3ogoug';

export interface KeepAliveResponse {
  ok: boolean;
  mode: 'supabase' | 'local-only';
  checkedAt: string;
  dusunCount?: number;
}

export default async function handler(): Promise<Response> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  const checkedAt = new Date().toISOString();

  if (!supabaseUrl || !supabaseKey) {
    const body: KeepAliveResponse = {
      ok: true,
      mode: 'local-only',
      checkedAt,
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { count, error } = await supabase
    .from('dusun')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, mode: 'supabase', checkedAt, error: error.message }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const body: KeepAliveResponse = {
    ok: true,
    mode: 'supabase',
    checkedAt,
    dusunCount: count ?? 0,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
