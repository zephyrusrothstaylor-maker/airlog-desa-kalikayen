import { SEED_CONDITION_LOGS, SEED_DUSUN, SEED_WATER_FACILITIES } from '../data/seedData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  CreateWaterFacilityInput,
  Dusun,
  FacilityConditionLog,
  InventorySummaryStats,
  UpdateConditionInput,
  UpdateDusunInput,
  WaterFacility,
} from '../types/inventory';
import {
  clearOfflineQueue,
  clearSyncConflicts,
  dismissSyncConflict,
  enqueueCreateFacility,
  enqueueDeleteFacility,
  enqueueUpdateCondition,
  enqueueUpdateDusun,
  enqueueUpdateFacility,
  flushOfflineQueue,
  getOfflineQueueCount,
  isConnectivityFailure,
  readSyncConflicts,
  type OfflineSyncConflict,
  type RemoteSyncAdapter,
  type SyncQueueResult,
} from './offlineQueue.ts';

export const PUBLIC_PORTAL_ENDPOINT =
  'https://uwntlfrttdwyucmtsdpq.supabase.co/functions/v1/airlog-public-portal';

const STORAGE_KEYS = {
  DUSUN: 'si_air_kalikayen_dusun_v3',
  FACILITIES: 'si_air_kalikayen_facilities_v3',
  LOGS: 'si_air_kalikayen_condition_logs_v3',
} as const;

export type DataConnectionMode = 'cloud' | 'offline';
export type WriteDestinationMode = 'cloud' | 'offline-queued';

let currentConnectionMode: DataConnectionMode = isSupabaseConfigured ? 'cloud' : 'offline';
let lastWriteMode: WriteDestinationMode = isSupabaseConfigured ? 'cloud' : 'offline-queued';
let syncInFlight: Promise<SyncQueueResult> | null = null;

async function hasAuthenticatedSession(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.access_token);
  } catch {
    return false;
  }
}

export function clearCachedInventoryData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DUSUN);
    localStorage.removeItem(STORAGE_KEYS.FACILITIES);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  } catch {
    // Ignore storage access errors
  }
}

export function getDataConnectionMode(): DataConnectionMode {
  return currentConnectionMode;
}

export function getLastWriteMode(): WriteDestinationMode {
  return lastWriteMode;
}

export function getPendingSyncCount(): number {
  return getOfflineQueueCount();
}

export function getSyncConflicts(): OfflineSyncConflict[] {
  return readSyncConflicts();
}

export function dismissSyncConflictItem(conflictId: string): OfflineSyncConflict[] {
  return dismissSyncConflict(conflictId);
}

export function clearAllSyncConflicts(): void {
  clearSyncConflicts();
}

export type { OfflineSyncConflict };

function isNavigatorOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

function canAttemptCloud(): boolean {
  return Boolean(isSupabaseConfigured && supabase && isNavigatorOnline());
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T, throwOnQuota = false): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    if (!throwOnQuota) return;
    const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
    if (msg.includes('quota') || msg.includes('exceeded') || msg.includes('storage')) {
      throw new Error(
        'Memori offline perangkat penuh (kuota penyimpanan habis). Hapus lampiran foto atau sambungkan internet untuk menyinkronkan data terlebih dahulu.'
      );
    }
    throw new Error('Gagal menyimpan data lokal ke penyimpanan perangkat.');
  }
}

function formatSupabaseActionError(actionLabel: string, errMessage: string): string {
  const lower = errMessage.toLowerCase();
  if (lower.includes('duplicate key') || lower.includes('water_facilities_code_key')) {
    return 'Kode plang tersebut sudah terdaftar. Gunakan kode titik air yang berbeda.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return `${actionLabel} gagal: tidak ada koneksi internet ke server Cloud.`;
  }
  return `${actionLabel}: ${errMessage}`;
}

function buildFacilityPayload(input: CreateWaterFacilityInput, nowIso: string) {
  return {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    dusun_id: input.dusun_id,
    rt: input.rt?.trim() || null,
    rw: input.rw?.trim() || null,
    address_detail: input.address_detail?.trim() || null,
    category: input.category,
    condition: input.condition,
    water_clarity: input.water_clarity,
    seasonal_availability: input.seasonal_availability,
    condition_notes: input.condition_notes?.trim() || null,
    latitude: input.latitude,
    longitude: input.longitude,
    elevation_m: input.elevation_m ?? null,
    beneficiary_kk: input.beneficiary_kk,
    built_year: input.built_year ?? null,
    funding_source: input.funding_source?.trim() || null,
    manager_name: input.manager_name?.trim() || null,
    manager_phone: input.manager_phone?.trim() || null,
    photo_url: input.photo_url ?? null,
    last_inspected_by: input.last_inspected_by.trim() || 'Perangkat Desa Kalikayen',
    last_inspected_at: nowIso,
  };
}

function resolveDusunName(dusunId: string): string {
  const cached = readLocal<Dusun[]>(STORAGE_KEYS.DUSUN, SEED_DUSUN);
  return cached.find((d) => d.id === dusunId)?.name ?? 'Dusun';
}

const remoteAdapter: RemoteSyncAdapter = {
  async createFacility(input) {
    if (!supabase) throw new Error('Supabase client tidak tersedia.');
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('water_facilities')
      .insert(buildFacilityPayload(input, nowIso))
      .select()
      .single();
    if (error) throw error;
    const created = data as WaterFacility;
    return { ...created, dusun_name: resolveDusunName(created.dusun_id) };
  },

  async updateFacility(facilityId, input) {
    if (!supabase) throw new Error('Supabase client tidak tersedia.');
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('water_facilities')
      .update(buildFacilityPayload(input, nowIso))
      .eq('id', facilityId)
      .select()
      .single();
    if (error) throw error;
    const updated = data as WaterFacility;
    return { ...updated, dusun_name: resolveDusunName(updated.dusun_id) };
  },

  async updateFacilityCondition(input) {
    if (!supabase) throw new Error('Supabase client tidak tersedia.');
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      condition: input.condition,
      condition_notes: input.condition_notes.trim() || null,
      last_inspected_by: input.inspector_name.trim() || 'Perangkat Desa',
      last_inspected_at: nowIso,
    };
    if (input.water_clarity) updatePayload.water_clarity = input.water_clarity;
    if (input.seasonal_availability) updatePayload.seasonal_availability = input.seasonal_availability;
    if (input.photo_url !== undefined) updatePayload.photo_url = input.photo_url;

    const { data, error } = await supabase
      .from('water_facilities')
      .update(updatePayload)
      .eq('id', input.facility_id)
      .select()
      .single();
    if (error) throw error;
    const updated = data as WaterFacility;
    return { ...updated, dusun_name: resolveDusunName(updated.dusun_id) };
  },

  async updateDusunInfo(input) {
    if (!supabase) throw new Error('Supabase client tidak tersedia.');
    const payload = {
      head_name: input.head_name.trim() || null,
      head_phone: input.head_phone.trim() || null,
      total_kk: Math.max(0, Math.round(input.total_kk || 0)),
    };
    const { data, error } = await supabase
      .from('dusun')
      .update(payload)
      .eq('id', input.id)
      .select()
      .single();
    if (error) throw error;
    return data as Dusun;
  },

  async deleteFacility(facilityId) {
    if (!supabase) throw new Error('Supabase client tidak tersedia.');
    const { error } = await supabase.from('water_facilities').delete().eq('id', facilityId);
    if (error) throw error;
  },
};

/**
 * Menyinkronkan seluruh antrean operasi offline ke Supabase Cloud secara FIFO.
 * Dilindungi lock agar panggilan beruntun tidak mengirim operasi ganda.
 */
export async function syncPendingOperations(): Promise<SyncQueueResult> {
  if (syncInFlight) return syncInFlight;

  const pending = getOfflineQueueCount();
  if (pending === 0) {
    return { syncedCount: 0, remainingCount: 0, errors: [], abortedByNetwork: false };
  }

  if (!canAttemptCloud() || !(await hasAuthenticatedSession())) {
    currentConnectionMode = canAttemptCloud() ? 'cloud' : 'offline';
    return {
      syncedCount: 0,
      remainingCount: pending,
      errors: [],
      abortedByNetwork: !canAttemptCloud(),
      abortedByAuth: canAttemptCloud(),
    };
  }

  syncInFlight = flushOfflineQueue(remoteAdapter, {
    facilitiesKey: STORAGE_KEYS.FACILITIES,
    logsKey: STORAGE_KEYS.LOGS,
  }).finally(() => {
    syncInFlight = null;
  });

  const result = await syncInFlight;
  currentConnectionMode = result.abortedByNetwork ? 'offline' : 'cloud';
  return result;
}

export interface PublicOverviewBundle {
  dusun: Dusun[];
  facilities: WaterFacility[];
  conditionLogs: FacilityConditionLog[];
}

export async function getPublicOverviewBundle(): Promise<PublicOverviewBundle> {
  if (isNavigatorOnline()) {
    try {
      const response = await fetch(`${PUBLIC_PORTAL_ENDPOINT}?action=overview`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const data = (await response.json()) as {
          dusun?: Dusun[];
          facilities?: WaterFacility[];
          conditionLogs?: FacilityConditionLog[];
        };
        const dusun = Array.isArray(data.dusun) ? data.dusun : SEED_DUSUN;
        const facilities = Array.isArray(data.facilities) ? data.facilities : SEED_WATER_FACILITIES;
        const conditionLogs = Array.isArray(data.conditionLogs)
          ? data.conditionLogs
          : SEED_CONDITION_LOGS;

        currentConnectionMode = 'cloud';
        writeLocal(STORAGE_KEYS.DUSUN, dusun);
        writeLocal(STORAGE_KEYS.FACILITIES, facilities);
        writeLocal(STORAGE_KEYS.LOGS, conditionLogs);
        return { dusun, facilities, conditionLogs };
      }
    } catch {
      // Fallback to local device cache when offline/unreachable
    }
  }

  currentConnectionMode = 'offline';
  const dusun = readLocal<Dusun[]>(STORAGE_KEYS.DUSUN, SEED_DUSUN);
  const dusunMap = new Map(dusun.map((d) => [d.id, d.name]));
  const facilities = readLocal<WaterFacility[]>(
    STORAGE_KEYS.FACILITIES,
    SEED_WATER_FACILITIES
  ).map((item) => ({
    ...item,
    dusun_name: dusunMap.get(item.dusun_id) ?? item.dusun_name ?? 'Dusun',
  }));
  const conditionLogs = readLocal<FacilityConditionLog[]>(
    STORAGE_KEYS.LOGS,
    SEED_CONDITION_LOGS
  );
  return { dusun, facilities, conditionLogs };
}

export async function submitCitizenConditionReport(
  input: UpdateConditionInput
): Promise<WaterFacility> {
  if (!isNavigatorOnline()) {
    throw new Error(
      'Laporan warga tanpa login memerlukan koneksi internet aktif. Atau login dengan akun Pemdes untuk menyimpan secara offline.'
    );
  }

  const response = await fetch(`${PUBLIC_PORTAL_ENDPOINT}?action=report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      facility_id: input.facility_id,
      condition: input.condition,
      water_clarity: input.water_clarity,
      seasonal_availability: input.seasonal_availability,
      condition_notes: input.condition_notes,
      photo_url: input.photo_url,
      inspector_name: input.inspector_name,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    facility?: WaterFacility;
    error?: string;
  };
  if (!response.ok || !payload.facility) {
    throw new Error(payload.error || 'Gagal mengirim laporan kondisi warga ke server.');
  }

  currentConnectionMode = 'cloud';
  lastWriteMode = 'cloud';
  return payload.facility;
}

export async function getDusunList(): Promise<Dusun[]> {
  if (canAttemptCloud() && supabase && getOfflineQueueCount() === 0 && (await hasAuthenticatedSession())) {
    try {
      const { data, error } = await supabase
        .from('dusun')
        .select('id, code, name, head_name, head_phone, total_kk, created_at, updated_at')
        .order('code', { ascending: true });

      if (!error && data) {
        currentConnectionMode = 'cloud';
        writeLocal(STORAGE_KEYS.DUSUN, data as Dusun[]);
        return data as Dusun[];
      }
    } catch {
      // Fallback to cached local dusun list
    }
  }

  currentConnectionMode = 'offline';
  return readLocal<Dusun[]>(STORAGE_KEYS.DUSUN, SEED_DUSUN);
}

export async function getFacilities(): Promise<WaterFacility[]> {
  const dusunList = await getDusunList();
  const dusunMap = new Map(dusunList.map((d) => [d.id, d.name]));

  if (canAttemptCloud() && supabase && getOfflineQueueCount() === 0 && (await hasAuthenticatedSession())) {
    try {
      const { data, error } = await supabase
        .from('water_facilities')
        .select(
          'id, code, name, dusun_id, rt, rw, address_detail, category, condition, water_clarity, seasonal_availability, condition_notes, latitude, longitude, elevation_m, beneficiary_kk, built_year, funding_source, manager_name, manager_phone, photo_url, last_inspected_at, last_inspected_by, created_at, updated_at'
        )
        .order('code', { ascending: true });

      if (!error && data) {
        currentConnectionMode = 'cloud';
        const mapped = (data as WaterFacility[]).map((item) => ({
          ...item,
          dusun_name: dusunMap.get(item.dusun_id) ?? 'Dusun',
        }));
        writeLocal(STORAGE_KEYS.FACILITIES, mapped);
        return mapped;
      }
    } catch {
      // Fallback to cached local facilities
    }
  }

  currentConnectionMode = 'offline';
  const localFacilities = readLocal<WaterFacility[]>(
    STORAGE_KEYS.FACILITIES,
    SEED_WATER_FACILITIES
  );

  return localFacilities.map((item) => ({
    ...item,
    dusun_name: dusunMap.get(item.dusun_id) ?? item.dusun_name ?? 'Dusun',
  }));
}

function applyLocalCreateFacility(input: CreateWaterFacilityInput, nowIso: string): WaterFacility {
  const dusunName = resolveDusunName(input.dusun_id);
  const newFacility: WaterFacility = {
    id: crypto.randomUUID(),
    ...buildFacilityPayload(input, nowIso),
    dusun_name: dusunName,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const current = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  writeLocal(STORAGE_KEYS.FACILITIES, [newFacility, ...current], true);

  const currentLogs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  const initialLog: FacilityConditionLog = {
    id: crypto.randomUUID(),
    facility_id: newFacility.id,
    previous_condition: null,
    new_condition: newFacility.condition,
    notes: newFacility.condition_notes,
    photo_url: newFacility.photo_url,
    inspector_name: newFacility.last_inspected_by,
    inspected_at: nowIso,
  };
  try {
    writeLocal(STORAGE_KEYS.LOGS, [initialLog, ...currentLogs], true);
  } catch (err) {
    writeLocal(STORAGE_KEYS.FACILITIES, current);
    throw err;
  }
  return newFacility;
}

function applyLocalUpdateFacility(
  facilityId: string,
  input: CreateWaterFacilityInput,
  nowIso: string
): WaterFacility {
  const dusunName = resolveDusunName(input.dusun_id);
  const current = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  const idx = current.findIndex((item) => item.id === facilityId);
  if (idx === -1) {
    throw new Error('Titik fasilitas air tidak ditemukan.');
  }

  const existing = current[idx];
  const updated: WaterFacility = {
    ...existing,
    ...buildFacilityPayload(input, nowIso),
    dusun_name: dusunName,
    updated_at: nowIso,
  };
  const next = [...current];
  next[idx] = updated;
  writeLocal(STORAGE_KEYS.FACILITIES, next, true);
  return updated;
}

function applyLocalUpdateDusun(input: UpdateDusunInput): Dusun {
  const current = readLocal<Dusun[]>(STORAGE_KEYS.DUSUN, SEED_DUSUN);
  const idx = current.findIndex((item) => item.id === input.id);
  if (idx === -1) {
    throw new Error('Data dusun tidak ditemukan.');
  }
  const updated: Dusun = {
    ...current[idx],
    head_name: input.head_name.trim() || null,
    head_phone: input.head_phone.trim() || null,
    total_kk: Math.max(0, Math.round(input.total_kk || 0)),
    updated_at: new Date().toISOString(),
  };
  const next = [...current];
  next[idx] = updated;
  writeLocal(STORAGE_KEYS.DUSUN, next, true);
  return updated;
}

function applyLocalUpdateCondition(input: UpdateConditionInput, nowIso: string): WaterFacility {
  const current = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  const idx = current.findIndex((item) => item.id === input.facility_id);
  if (idx === -1) {
    throw new Error('Titik fasilitas air tidak ditemukan.');
  }

  const existing = current[idx];
  const updated: WaterFacility = {
    ...existing,
    condition: input.condition,
    water_clarity: input.water_clarity ?? existing.water_clarity,
    seasonal_availability: input.seasonal_availability ?? existing.seasonal_availability,
    condition_notes: input.condition_notes.trim() || null,
    photo_url: input.photo_url !== undefined ? input.photo_url : existing.photo_url,
    last_inspected_by: input.inspector_name.trim() || 'Perangkat Desa',
    last_inspected_at: nowIso,
    updated_at: nowIso,
  };

  const nextFacilities = [...current];
  nextFacilities[idx] = updated;
  writeLocal(STORAGE_KEYS.FACILITIES, nextFacilities, true);

  const currentLogs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  const newLog: FacilityConditionLog = {
    id: crypto.randomUUID(),
    facility_id: existing.id,
    previous_condition: existing.condition,
    new_condition: updated.condition,
    notes: updated.condition_notes,
    photo_url: updated.photo_url,
    inspector_name: updated.last_inspected_by,
    inspected_at: nowIso,
  };
  try {
    writeLocal(STORAGE_KEYS.LOGS, [newLog, ...currentLogs], true);
  } catch (err) {
    writeLocal(STORAGE_KEYS.FACILITIES, current);
    throw err;
  }
  return updated;
}

function applyLocalDeleteFacility(facilityId: string): void {
  const current = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  writeLocal(
    STORAGE_KEYS.FACILITIES,
    current.filter((item) => item.id !== facilityId)
  );
  const currentLogs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  writeLocal(
    STORAGE_KEYS.LOGS,
    currentLogs.filter((log) => log.facility_id !== facilityId)
  );
}

export async function createFacility(input: CreateWaterFacilityInput): Promise<WaterFacility> {
  if (!(await hasAuthenticatedSession())) {
    throw new Error('Login akun Perangkat Desa (Pemdes) diperlukan untuk menambah titik air.');
  }
  const nowIso = new Date().toISOString();

  if (canAttemptCloud()) {
    try {
      const created = await remoteAdapter.createFacility(input);
      currentConnectionMode = 'cloud';
      lastWriteMode = 'cloud';
      return created;
    } catch (err) {
      if (!isConnectivityFailure(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(formatSupabaseActionError('Gagal menyimpan fasilitas ke Cloud', msg));
      }
    }
  }

  const prevFacilities = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  const prevLogs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  const createdLocal = applyLocalCreateFacility(input, nowIso);
  try {
    if (isSupabaseConfigured) {
      enqueueCreateFacility(createdLocal.id, input);
    }
  } catch (err) {
    writeLocal(STORAGE_KEYS.FACILITIES, prevFacilities);
    writeLocal(STORAGE_KEYS.LOGS, prevLogs);
    throw err;
  }
  currentConnectionMode = 'offline';
  lastWriteMode = 'offline-queued';
  return createdLocal;
}

export async function updateFacility(
  facilityId: string,
  input: CreateWaterFacilityInput
): Promise<WaterFacility> {
  if (!(await hasAuthenticatedSession())) {
    throw new Error('Login akun Perangkat Desa (Pemdes) diperlukan untuk mengubah titik air.');
  }
  const nowIso = new Date().toISOString();

  if (canAttemptCloud() && getOfflineQueueCount() === 0) {
    try {
      const updated = await remoteAdapter.updateFacility(facilityId, input);
      currentConnectionMode = 'cloud';
      lastWriteMode = 'cloud';
      return updated;
    } catch (err) {
      if (!isConnectivityFailure(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(formatSupabaseActionError('Gagal memperbarui data titik air', msg));
      }
    }
  }

  const prevFacilities = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  const updatedLocal = applyLocalUpdateFacility(facilityId, input, nowIso);
  try {
    if (isSupabaseConfigured) {
      enqueueUpdateFacility(facilityId, input);
    }
  } catch (err) {
    writeLocal(STORAGE_KEYS.FACILITIES, prevFacilities);
    throw err;
  }
  currentConnectionMode = 'offline';
  lastWriteMode = 'offline-queued';
  return updatedLocal;
}

export async function updateDusunInfo(input: UpdateDusunInput): Promise<Dusun> {
  if (!(await hasAuthenticatedSession())) {
    throw new Error('Login akun Perangkat Desa (Pemdes) diperlukan untuk mengubah data Dusun.');
  }
  if (canAttemptCloud() && getOfflineQueueCount() === 0) {
    try {
      const updated = await remoteAdapter.updateDusunInfo(input);
      currentConnectionMode = 'cloud';
      lastWriteMode = 'cloud';
      return updated;
    } catch (err) {
      if (!isConnectivityFailure(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(formatSupabaseActionError('Gagal memperbarui data dusun', msg));
      }
    }
  }

  const prevDusun = readLocal<Dusun[]>(STORAGE_KEYS.DUSUN, SEED_DUSUN);
  const updatedLocal = applyLocalUpdateDusun(input);
  try {
    if (isSupabaseConfigured) {
      enqueueUpdateDusun(input);
    }
  } catch (err) {
    writeLocal(STORAGE_KEYS.DUSUN, prevDusun);
    throw err;
  }
  currentConnectionMode = 'offline';
  lastWriteMode = 'offline-queued';
  return updatedLocal;
}

export async function updateFacilityCondition(
  input: UpdateConditionInput
): Promise<WaterFacility> {
  if (!(await hasAuthenticatedSession())) {
    return submitCitizenConditionReport(input);
  }
  const nowIso = new Date().toISOString();

  if (canAttemptCloud() && getOfflineQueueCount() === 0) {
    try {
      const updated = await remoteAdapter.updateFacilityCondition(input);
      currentConnectionMode = 'cloud';
      lastWriteMode = 'cloud';
      return updated;
    } catch (err) {
      if (!isConnectivityFailure(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(formatSupabaseActionError('Gagal memperbarui kondisi fisik', msg));
      }
    }
  }

  const prevFacilities = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  const prevLogs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  const updatedLocal = applyLocalUpdateCondition(input, nowIso);
  try {
    if (isSupabaseConfigured) {
      enqueueUpdateCondition(input);
    }
  } catch (err) {
    writeLocal(STORAGE_KEYS.FACILITIES, prevFacilities);
    writeLocal(STORAGE_KEYS.LOGS, prevLogs);
    throw err;
  }
  currentConnectionMode = 'offline';
  lastWriteMode = 'offline-queued';
  return updatedLocal;
}

export async function deleteFacility(facilityId: string): Promise<void> {
  if (!(await hasAuthenticatedSession())) {
    throw new Error('Login akun Admin Desa diperlukan untuk menghapus titik air.');
  }
  if (canAttemptCloud() && getOfflineQueueCount() === 0) {
    try {
      await remoteAdapter.deleteFacility(facilityId);
      currentConnectionMode = 'cloud';
      lastWriteMode = 'cloud';
      return;
    } catch (err) {
      if (!isConnectivityFailure(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(formatSupabaseActionError('Gagal menghapus fasilitas', msg));
      }
    }
  }

  const prevFacilities = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  const prevLogs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  applyLocalDeleteFacility(facilityId);
  try {
    if (isSupabaseConfigured) {
      enqueueDeleteFacility(facilityId);
    }
  } catch (err) {
    writeLocal(STORAGE_KEYS.FACILITIES, prevFacilities);
    writeLocal(STORAGE_KEYS.LOGS, prevLogs);
    throw err;
  }
  currentConnectionMode = 'offline';
  lastWriteMode = 'offline-queued';
}

async function fetchSupabaseConditionLogs(
  facilityId?: string
): Promise<FacilityConditionLog[] | null> {
  if (!canAttemptCloud() || !supabase || getOfflineQueueCount() > 0 || !(await hasAuthenticatedSession())) {
    return null;
  }
  try {
    let query = supabase
      .from('facility_condition_logs')
      .select('id, facility_id, previous_condition, new_condition, notes, photo_url, inspector_name, inspected_at')
      .order('inspected_at', { ascending: false });

    if (facilityId) {
      query = query.eq('facility_id', facilityId);
    }

    const { data, error } = await query;
    if (error || !data) return null;

    const logs = data as FacilityConditionLog[];
    if (!facilityId) {
      writeLocal(STORAGE_KEYS.LOGS, logs);
    }
    return logs;
  } catch {
    return null;
  }
}

export async function getConditionLogs(facilityId?: string): Promise<FacilityConditionLog[]> {
  const remoteLogs = await fetchSupabaseConditionLogs(facilityId);
  if (remoteLogs) return remoteLogs;

  const logs = readLocal<FacilityConditionLog[]>(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
  return facilityId ? logs.filter((log) => log.facility_id === facilityId) : logs;
}

export function computeSummaryStats(facilities: WaterFacility[]): InventorySummaryStats {
  return facilities.reduce<InventorySummaryStats>(
    (acc, item) => {
      acc.totalFacilities += 1;
      acc.totalBeneficiaryKK += item.beneficiary_kk || 0;
      if (item.condition === 'berfungsi_baik') acc.berfungsiBaik += 1;
      else if (item.condition === 'rusak_ringan') acc.rusakRingan += 1;
      else if (item.condition === 'rusak_berat') acc.rusakBerat += 1;
      else if (item.condition === 'kering') acc.kering += 1;
      return acc;
    },
    {
      totalFacilities: 0,
      berfungsiBaik: 0,
      rusakRingan: 0,
      rusakBerat: 0,
      kering: 0,
      totalBeneficiaryKK: 0,
    }
  );
}

export function resetDemoData(): void {
  clearOfflineQueue();
  writeLocal(STORAGE_KEYS.DUSUN, SEED_DUSUN);
  writeLocal(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  writeLocal(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
}
