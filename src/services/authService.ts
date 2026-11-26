import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type PemdesRole = 'admin' | 'pemdes';

export interface PemdesSessionInfo {
  userId: string;
  email: string;
  displayName: string;
  role: PemdesRole;
}

/**
 * Mengekstrak profil sesi Pemdes dengan otorisasi peran berasal strictly dari `app_metadata`
 * (bukan `user_metadata` yang dapat dimodifikasi sisi klien).
 */
export function extractPemdesSessionInfo(session: Session | null): PemdesSessionInfo | null {
  if (!session?.user) return null;
  const appMeta = (session.user.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const rawRole = typeof appMeta.role === 'string' ? appMeta.role.toLowerCase() : '';
  const role: PemdesRole = rawRole === 'admin' ? 'admin' : 'pemdes';
  const email = session.user.email ?? 'perangkat@kalikayen.desa.id';
  const fullName = typeof userMeta.full_name === 'string' ? userMeta.full_name.trim() : '';

  return {
    userId: session.user.id,
    email,
    displayName: fullName || email.split('@')[0] || 'Perangkat Desa',
    role,
  };
}

export async function getCurrentPemdesSession(): Promise<PemdesSessionInfo | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return extractPemdesSessionInfo(data.session);
  } catch {
    return null;
  }
}

export function subscribePemdesAuth(
  onChange: (sessionInfo: PemdesSessionInfo | null) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(extractPemdesSessionInfo(session));
  });
  return () => {
    subscription.unsubscribe();
  };
}

export async function signInPemdes(email: string, password: string): Promise<PemdesSessionInfo> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Koneksi autentikasi Supabase tidak tersedia.');
  }

  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    throw new Error('Email dan kata sandi Pemdes wajib diisi.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      throw new Error('Email atau kata sandi Pemdes tidak sesuai.');
    }
    if (lower.includes('email not confirmed')) {
      throw new Error('Akun email Pemdes belum diverifikasi.');
    }
    throw new Error(`Gagal login Pemdes: ${error.message}`);
  }

  const info = extractPemdesSessionInfo(data.session);
  if (!info) {
    throw new Error('Sesi login tidak ditemukan.');
  }
  return info;
}

export async function signOutPemdes(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.auth.signOut();
}
