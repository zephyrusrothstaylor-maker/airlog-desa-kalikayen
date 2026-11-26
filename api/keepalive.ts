import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: Record<string, string | undefined>;
};

const DEFAULT_SUPABASE_URL = 'https://uwntlfrttdwyucmtsdpq.supabase.co';
const SUPABASE_KEEPALIVE_GATEWAY =
  'https://uwntlfrttdwyucmtsdpq.supabase.co/functions/v1/airlog-public-portal?action=keepalive';

export interface KeepAliveResponse {
  ok: boolean;
  mode: 'supabase' | 'local-only';
  checkedAt: string;
  dusunCount?: number;
}

function readServerEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

export async function GET(): Promise<Response> {
  const supabaseUrl =
    readServerEnv('VITE_SUPABASE_URL') || readServerEnv('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const serviceKey =
    readServerEnv('SUPABASE_SERVICE_ROLE_KEY') || readServerEnv('SUPABASE_SECRET_KEY');
  const checkedAt = new Date().toISOString();

  if (serviceKey && supabaseUrl) {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
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

  try {
    const upstream = await fetch(SUPABASE_KEEPALIVE_GATEWAY);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ok: false, mode: 'supabase', checkedAt, error: message }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    );
  }
}
