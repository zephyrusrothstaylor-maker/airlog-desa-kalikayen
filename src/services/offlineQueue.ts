import type {
  CreateWaterFacilityInput,
  Dusun,
  FacilityConditionLog,
  UpdateConditionInput,
  UpdateDusunInput,
  WaterFacility,
} from '../types/inventory.ts';

export const OFFLINE_QUEUE_STORAGE_KEY = 'si_air_kalikayen_offline_queue_v1';
export const OFFLINE_CONFLICTS_STORAGE_KEY = 'si_air_kalikayen_sync_conflicts_v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface OfflineSyncConflict {
  id: string;
  label: string;
  reason: string;
  failedAt: string;
}

export type OfflineQueueOp =
  | {
      queueId: string;
      type: 'create_facility';
      localId: string;
      input: CreateWaterFacilityInput;
      queuedAt: string;
    }
  | {
      queueId: string;
      type: 'update_facility';
      facilityId: string;
      input: CreateWaterFacilityInput;
      queuedAt: string;
    }
  | {
      queueId: string;
      type: 'update_condition';
      input: UpdateConditionInput;
      queuedAt: string;
    }
  | {
      queueId: string;
      type: 'update_dusun';
      input: UpdateDusunInput;
      queuedAt: string;
    }
  | {
      queueId: string;
      type: 'delete_facility';
      facilityId: string;
      queuedAt: string;
    };

export interface SyncQueueResult {
  syncedCount: number;
  remainingCount: number;
  errors: string[];
  abortedByNetwork: boolean;
  abortedByAuth?: boolean;
}

export interface RemoteSyncAdapter {
  createFacility(input: CreateWaterFacilityInput): Promise<WaterFacility>;
  updateFacility(facilityId: string, input: CreateWaterFacilityInput): Promise<WaterFacility>;
  updateFacilityCondition(input: UpdateConditionInput): Promise<WaterFacility>;
  updateDusunInfo(input: UpdateDusunInput): Promise<Dusun>;
  deleteFacility(facilityId: string): Promise<void>;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
}

function makeQueueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function extractErrorMessage(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return `${err.name} ${err.message}`;
  if (typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message ?? '');
  }
  return String(err);
}

/**
 * Mengidentifikasi error akibat sesi autentikasi belum aktif atau JWT kedaluwarsa,
 * sehingga antrean lokal tetap dipertahankan sampai perangkat desa login kembali.
 */
export function isAuthFailure(err: unknown): boolean {
  const lower = extractErrorMessage(err).toLowerCase();
  if (!lower) return false;
  return (
    lower.includes('jwt') ||
    lower.includes('not authenticated') ||
    lower.includes('permission denied') ||
    lower.includes('row-level security') ||
    lower.includes('401') ||
    lower.includes('unauthorized')
  );
}

/**
 * Mengklasifikasikan apakah sebuah error berasal dari putusnya koneksi jaringan/offline
 * (layak diantrekan untuk sync ulang), bukan error validasi/aturan database Postgres.
 */
export function isConnectivityFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  if (!err) return false;

  const lower = extractErrorMessage(err).toLowerCase();

  // Business / Postgres constraint / Auth errors must never be retried blindly as offline connectivity drops
  if (
    lower.includes('duplicate key') ||
    lower.includes('violates') ||
    lower.includes('check constraint') ||
    isAuthFailure(err)
  ) {
    return false;
  }

  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('fetch failed') ||
    lower.includes('err_network') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('timeout') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504')
  );
}

/** Membaca daftar antrean operasi offline dari storage. */
export function readOfflineQueue(storage: StorageLike | null = getDefaultStorage()): OfflineQueueOp[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineQueueOp[]) : [];
  } catch {
    return [];
  }
}

/** Menyimpan daftar antrean operasi offline ke storage dengan deteksi kuota penuh. */
export function writeOfflineQueue(
  ops: OfflineQueueOp[],
  storage: StorageLike | null = getDefaultStorage(),
  options?: { suppressQuotaError?: boolean }
): void {
  if (!storage) return;
  try {
    if (ops.length === 0) {
      storage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
    } else {
      storage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(ops));
    }
  } catch (err) {
    if (options?.suppressQuotaError) return;
    const msg = extractErrorMessage(err).toLowerCase();
    if (msg.includes('quota') || msg.includes('exceeded') || msg.includes('storage')) {
      throw new Error(
        'Memori offline perangkat penuh (kuota penyimpanan habis). Kurangi lampiran foto atau sambungkan internet untuk menyinkronkan antrean terlebih dahulu.'
      );
    }
    throw new Error('Gagal menyimpan antrean offline ke penyimpanan perangkat.');
  }
}

export function readSyncConflicts(
  storage: StorageLike | null = getDefaultStorage()
): OfflineSyncConflict[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(OFFLINE_CONFLICTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OfflineSyncConflict[]) : [];
  } catch {
    return [];
  }
}

function writeSyncConflicts(
  conflicts: OfflineSyncConflict[],
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    if (conflicts.length === 0) {
      storage.removeItem(OFFLINE_CONFLICTS_STORAGE_KEY);
    } else {
      storage.setItem(OFFLINE_CONFLICTS_STORAGE_KEY, JSON.stringify(conflicts.slice(0, 20)));
    }
  } catch {
    // Non-critical diagnostic list
  }
}

export function dismissSyncConflict(
  conflictId: string,
  storage: StorageLike | null = getDefaultStorage()
): OfflineSyncConflict[] {
  const next = readSyncConflicts(storage).filter((c) => c.id !== conflictId);
  writeSyncConflicts(next, storage);
  return next;
}

export function clearSyncConflicts(storage: StorageLike | null = getDefaultStorage()): void {
  writeSyncConflicts([], storage);
}

/** Menghitung jumlah item yang menunggu sinkronisasi ke Cloud. */
export function getOfflineQueueCount(storage: StorageLike | null = getDefaultStorage()): number {
  return readOfflineQueue(storage).length;
}

/** Mengosongkan seluruh antrean offline (misal saat reset data demo). */
export function clearOfflineQueue(storage: StorageLike | null = getDefaultStorage()): void {
  writeOfflineQueue([], storage);
}

/** Menambahkan operasi create_facility offline ke antrean. */
export function enqueueCreateFacility(
  localId: string,
  input: CreateWaterFacilityInput,
  storage: StorageLike | null = getDefaultStorage()
): OfflineQueueOp[] {
  const queue = readOfflineQueue(storage);
  queue.push({
    queueId: makeQueueId(),
    type: 'create_facility',
    localId,
    input,
    queuedAt: new Date().toISOString(),
  });
  writeOfflineQueue(queue, storage);
  return queue;
}

/**
 * Menambahkan/menggabungkan update_facility offline ke antrean.
 * Jika titik air tersebut baru dibuat offline dan belum di-sync, data create-nya langsung diperbarui.
 */
export function enqueueUpdateFacility(
  facilityId: string,
  input: CreateWaterFacilityInput,
  storage: StorageLike | null = getDefaultStorage()
): OfflineQueueOp[] {
  const queue = readOfflineQueue(storage);
  const nowIso = new Date().toISOString();

  const createIdx = queue.findIndex(
    (op) => op.type === 'create_facility' && op.localId === facilityId
  );
  if (createIdx !== -1) {
    const existing = queue[createIdx] as Extract<OfflineQueueOp, { type: 'create_facility' }>;
    queue[createIdx] = { ...existing, input, queuedAt: nowIso };
    writeOfflineQueue(queue, storage);
    return queue;
  }

  const updateIdx = queue.findIndex(
    (op) => op.type === 'update_facility' && op.facilityId === facilityId
  );
  if (updateIdx !== -1) {
    const existing = queue[updateIdx] as Extract<OfflineQueueOp, { type: 'update_facility' }>;
    queue[updateIdx] = { ...existing, input, queuedAt: nowIso };
    writeOfflineQueue(queue, storage);
    return queue;
  }

  queue.push({
    queueId: makeQueueId(),
    type: 'update_facility',
    facilityId,
    input,
    queuedAt: nowIso,
  });
  writeOfflineQueue(queue, storage);
  return queue;
}

/** Menambahkan pembaruan kondisi fisik ke antrean offline. */
export function enqueueUpdateCondition(
  input: UpdateConditionInput,
  storage: StorageLike | null = getDefaultStorage()
): OfflineQueueOp[] {
  const queue = readOfflineQueue(storage);
  queue.push({
    queueId: makeQueueId(),
    type: 'update_condition',
    input,
    queuedAt: new Date().toISOString(),
  });
  writeOfflineQueue(queue, storage);
  return queue;
}

/** Menambahkan pembaruan data dusun (menggabungkan pembaruan untuk dusun yang sama). */
export function enqueueUpdateDusun(
  input: UpdateDusunInput,
  storage: StorageLike | null = getDefaultStorage()
): OfflineQueueOp[] {
  const queue = readOfflineQueue(storage);
  const nowIso = new Date().toISOString();
  const idx = queue.findIndex((op) => op.type === 'update_dusun' && op.input.id === input.id);
  if (idx !== -1) {
    const existing = queue[idx] as Extract<OfflineQueueOp, { type: 'update_dusun' }>;
    queue[idx] = { ...existing, input, queuedAt: nowIso };
  } else {
    queue.push({
      queueId: makeQueueId(),
      type: 'update_dusun',
      input,
      queuedAt: nowIso,
    });
  }
  writeOfflineQueue(queue, storage);
  return queue;
}

/**
 * Menambahkan penghapusan fasilitas ke antrean offline.
 * Jika fasilitas dibuat saat offline dan belum pernah masuk server, seluruh operasinya dibatalkan bersih.
 */
export function enqueueDeleteFacility(
  facilityId: string,
  storage: StorageLike | null = getDefaultStorage()
): OfflineQueueOp[] {
  const queue = readOfflineQueue(storage);
  const createdOffline = queue.some(
    (op) => op.type === 'create_facility' && op.localId === facilityId
  );

  const compacted = queue.filter((op) => {
    if (op.type === 'create_facility' && op.localId === facilityId) return false;
    if (op.type === 'update_facility' && op.facilityId === facilityId) return false;
    if (op.type === 'update_condition' && op.input.facility_id === facilityId) return false;
    if (op.type === 'delete_facility' && op.facilityId === facilityId) return false;
    return true;
  });

  if (!createdOffline) {
    compacted.push({
      queueId: makeQueueId(),
      type: 'delete_facility',
      facilityId,
      queuedAt: new Date().toISOString(),
    });
  }

  writeOfflineQueue(compacted, storage);
  return compacted;
}

function remapTargetIdInOp(op: OfflineQueueOp, fromId: string, toId: string): OfflineQueueOp {
  if (op.type === 'update_facility' && op.facilityId === fromId) {
    return { ...op, facilityId: toId };
  }
  if (op.type === 'update_condition' && op.input.facility_id === fromId) {
    return { ...op, input: { ...op.input, facility_id: toId } };
  }
  if (op.type === 'delete_facility' && op.facilityId === fromId) {
    return { ...op, facilityId: toId };
  }
  return op;
}

/** Memetakan ulang ID sementara lokal ke ID server Supabase pada cache fasilitas & log. */
export function remapLocalIdInCaches(
  storage: StorageLike | null,
  facilitiesKey: string,
  logsKey: string,
  fromId: string,
  toId: string
): void {
  if (!storage || fromId === toId) return;
  try {
    const rawFacilities = storage.getItem(facilitiesKey);
    if (rawFacilities) {
      const parsed = JSON.parse(rawFacilities) as WaterFacility[];
      if (Array.isArray(parsed)) {
        const updated = parsed.map((f) => (f.id === fromId ? { ...f, id: toId } : f));
        storage.setItem(facilitiesKey, JSON.stringify(updated));
      }
    }
    const rawLogs = storage.getItem(logsKey);
    if (rawLogs) {
      const parsedLogs = JSON.parse(rawLogs) as FacilityConditionLog[];
      if (Array.isArray(parsedLogs)) {
        const updatedLogs = parsedLogs.map((l) =>
          l.facility_id === fromId ? { ...l, facility_id: toId } : l
        );
        storage.setItem(logsKey, JSON.stringify(updatedLogs));
      }
    }
  } catch {
    // Abaikan error parsing cache
  }
}

function formatOpLabel(op: OfflineQueueOp): string {
  switch (op.type) {
    case 'create_facility':
      return `Tambah ${op.input.code.toUpperCase()}`;
    case 'update_facility':
      return `Edit ${op.input.code.toUpperCase()}`;
    case 'update_condition':
      return 'Update Kondisi';
    case 'update_dusun':
      return 'Update Dusun';
    case 'delete_facility':
      return 'Hapus Titik Air';
  }
}

/**
 * Menjalankan sinkronisasi FIFO seluruh operasi offline ke backend Cloud.
 * Jika koneksi kembali putus di tengah jalan, sisa antrean tetap dipertahankan.
 */
export async function flushOfflineQueue(
  adapter: RemoteSyncAdapter,
  options?: {
    storage?: StorageLike | null;
    facilitiesKey?: string;
    logsKey?: string;
  }
): Promise<SyncQueueResult> {
  const storage = options?.storage !== undefined ? options.storage : getDefaultStorage();
  const facilitiesKey = options?.facilitiesKey ?? 'si_air_kalikayen_facilities_v3';
  const logsKey = options?.logsKey ?? 'si_air_kalikayen_condition_logs_v3';

  let queue = readOfflineQueue(storage);
  if (queue.length === 0) {
    return { syncedCount: 0, remainingCount: 0, errors: [], abortedByNetwork: false };
  }

  let syncedCount = 0;
  const errors: string[] = [];

  while (queue.length > 0) {
    const current = queue[0];
    try {
      if (current.type === 'create_facility') {
        const created = await adapter.createFacility(current.input);
        queue = queue.slice(1).map((op) => remapTargetIdInOp(op, current.localId, created.id));
        remapLocalIdInCaches(storage, facilitiesKey, logsKey, current.localId, created.id);
      } else if (current.type === 'update_facility') {
        await adapter.updateFacility(current.facilityId, current.input);
        queue = queue.slice(1);
      } else if (current.type === 'update_condition') {
        await adapter.updateFacilityCondition(current.input);
        queue = queue.slice(1);
      } else if (current.type === 'update_dusun') {
        await adapter.updateDusunInfo(current.input);
        queue = queue.slice(1);
      } else if (current.type === 'delete_facility') {
        await adapter.deleteFacility(current.facilityId);
        queue = queue.slice(1);
      }

      syncedCount += 1;
      writeOfflineQueue(queue, storage, { suppressQuotaError: true });
    } catch (err) {
      if (isConnectivityFailure(err)) {
        return {
          syncedCount,
          remainingCount: queue.length,
          errors,
          abortedByNetwork: true,
          abortedByAuth: false,
        };
      }

      if (isAuthFailure(err)) {
        return {
          syncedCount,
          remainingCount: queue.length,
          errors,
          abortedByNetwork: false,
          abortedByAuth: true,
        };
      }

      const reason = err instanceof Error ? err.message : String(err);
      const label = formatOpLabel(current);
      errors.push(`${label}: ${reason}`);

      const existingConflicts = readSyncConflicts(storage);
      writeSyncConflicts(
        [
          {
            id: makeQueueId(),
            label,
            reason,
            failedAt: new Date().toISOString(),
          },
          ...existingConflicts,
        ],
        storage
      );

      // Drop conflicting/invalid item and any orphan child ops targeting its uncreated localId
      let nextQueue = queue.slice(1);
      if (current.type === 'create_facility') {
        nextQueue = nextQueue.filter((op) => {
          if (op.type === 'update_facility' && op.facilityId === current.localId) return false;
          if (op.type === 'update_condition' && op.input.facility_id === current.localId) {
            return false;
          }
          if (op.type === 'delete_facility' && op.facilityId === current.localId) return false;
          return true;
        });
      }
      queue = nextQueue;
      writeOfflineQueue(queue, storage, { suppressQuotaError: true });
    }
  }

  return {
    syncedCount,
    remainingCount: 0,
    errors,
    abortedByNetwork: false,
    abortedByAuth: false,
  };
}
