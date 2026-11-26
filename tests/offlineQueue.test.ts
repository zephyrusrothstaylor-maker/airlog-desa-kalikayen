import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearOfflineQueue,
  clearSyncConflicts,
  enqueueCreateFacility,
  enqueueDeleteFacility,
  enqueueUpdateCondition,
  enqueueUpdateDusun,
  enqueueUpdateFacility,
  flushOfflineQueue,
  getOfflineQueueCount,
  isConnectivityFailure,
  readOfflineQueue,
  readSyncConflicts,
  type RemoteSyncAdapter,
  type StorageLike,
} from '../src/services/offlineQueue.ts';
import type {
  CreateWaterFacilityInput,
  Dusun,
  WaterFacility,
} from '../src/types/inventory.ts';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

function makeFacilityInput(overrides: Partial<CreateWaterFacilityInput> = {}): CreateWaterFacilityInput {
  return {
    code: 'AIR-KKY-001',
    name: 'Sumur Bor Balai Desa',
    dusun_id: 'd1000000-0000-4000-8000-000000000001',
    category: 'sumur_bor',
    condition: 'berfungsi_baik',
    water_clarity: 'jernih',
    seasonal_availability: 'sepanjang_tahun',
    latitude: -7.0892,
    longitude: 110.4669,
    beneficiary_kk: 50,
    last_inspected_by: 'Kasun Kalikayen',
    ...overrides,
  };
}

function makeFacilityRow(id: string, input: CreateWaterFacilityInput): WaterFacility {
  const now = '2026-11-25T06:00:00.000Z';
  return {
    id,
    code: input.code,
    name: input.name,
    dusun_id: input.dusun_id,
    rt: input.rt ?? null,
    rw: input.rw ?? null,
    address_detail: input.address_detail ?? null,
    category: input.category,
    condition: input.condition,
    water_clarity: input.water_clarity,
    seasonal_availability: input.seasonal_availability,
    condition_notes: input.condition_notes ?? null,
    latitude: input.latitude,
    longitude: input.longitude,
    elevation_m: input.elevation_m ?? null,
    beneficiary_kk: input.beneficiary_kk,
    built_year: input.built_year ?? null,
    funding_source: input.funding_source ?? null,
    manager_name: input.manager_name ?? null,
    manager_phone: input.manager_phone ?? null,
    photo_url: input.photo_url ?? null,
    last_inspected_at: now,
    last_inspected_by: input.last_inspected_by,
    created_at: now,
    updated_at: now,
  };
}

test('isConnectivityFailure membedakan putus jaringan vs error validasi Postgres', () => {
  assert.equal(isConnectivityFailure(new TypeError('Failed to fetch')), true);
  assert.equal(isConnectivityFailure(new Error('NetworkError when attempting to fetch resource.')), true);
  assert.equal(isConnectivityFailure(new Error('503 Service Unavailable')), true);
  assert.equal(
    isConnectivityFailure(new Error('duplicate key value violates unique constraint "water_facilities_code_key"')),
    false
  );
  assert.equal(
    isConnectivityFailure(new Error('new row violates row-level security policy for table "water_facilities"')),
    false
  );
});

test('kompaksi antrean: edit item offline menggabungkan create, delete item offline membatalkan bersih', () => {
  const storage = createMemoryStorage();
  const input1 = makeFacilityInput({ name: 'Draft Awal' });
  enqueueCreateFacility('temp-1', input1, storage);
  enqueueUpdateFacility('temp-1', makeFacilityInput({ name: 'Draft Revisi' }), storage);
  enqueueUpdateCondition(
    {
      facility_id: 'temp-1',
      condition: 'rusak_ringan',
      condition_notes: 'Kran rembes',
      inspector_name: 'Kasun',
    },
    storage
  );

  let ops = readOfflineQueue(storage);
  assert.equal(ops.length, 2);
  assert.equal(ops[0].type, 'create_facility');
  assert.equal((ops[0] as Extract<typeof ops[0], { type: 'create_facility' }>).input.name, 'Draft Revisi');

  enqueueDeleteFacility('temp-1', storage);
  assert.equal(getOfflineQueueCount(storage), 0);

  enqueueUpdateDusun({ id: 'd1', head_name: 'Pak A', head_phone: '081', total_kk: 100 }, storage);
  enqueueUpdateDusun({ id: 'd1', head_name: 'Pak B', head_phone: '082', total_kk: 110 }, storage);
  ops = readOfflineQueue(storage);
  assert.equal(ops.length, 1);
  assert.equal((ops[0] as Extract<typeof ops[0], { type: 'update_dusun' }>).input.head_name, 'Pak B');

  clearOfflineQueue(storage);
  assert.equal(getOfflineQueueCount(storage), 0);
});

test('flushOfflineQueue memetakan tempId -> serverId pada operasi lanjutan dan memperbarui cache', async () => {
  const storage = createMemoryStorage();
  const facilitiesKey = 'fac_cache';
  const logsKey = 'logs_cache';

  const input = makeFacilityInput();
  storage.setItem(facilitiesKey, JSON.stringify([makeFacilityRow('temp-abc', input)]));
  storage.setItem(
    logsKey,
    JSON.stringify([
      {
        id: 'log-1',
        facility_id: 'temp-abc',
        previous_condition: null,
        new_condition: 'berfungsi_baik',
        notes: null,
        photo_url: null,
        inspector_name: 'Kasun',
        inspected_at: '2026-11-25T06:00:00.000Z',
      },
    ])
  );

  enqueueCreateFacility('temp-abc', input, storage);
  enqueueUpdateCondition(
    {
      facility_id: 'temp-abc',
      condition: 'rusak_berat',
      condition_notes: 'Pipa pecah',
      inspector_name: 'Kasun',
    },
    storage
  );

  const calls: string[] = [];
  const adapter: RemoteSyncAdapter = {
    async createFacility(payload) {
      calls.push(`create:${payload.code}`);
      return makeFacilityRow('srv-999', payload);
    },
    async updateFacility() {
      throw new Error('unused');
    },
    async updateFacilityCondition(payload) {
      calls.push(`condition:${payload.facility_id}:${payload.condition}`);
      return makeFacilityRow(payload.facility_id, makeFacilityInput({ condition: payload.condition }));
    },
    async updateDusunInfo(payload): Promise<Dusun> {
      return {
        id: payload.id,
        code: 'DSN-01',
        name: 'Dusun Kalikayen',
        head_name: payload.head_name,
        head_phone: payload.head_phone,
        total_kk: payload.total_kk,
        created_at: '',
        updated_at: '',
      };
    },
    async deleteFacility() {},
  };

  const result = await flushOfflineQueue(adapter, { storage, facilitiesKey, logsKey });
  assert.equal(result.syncedCount, 2);
  assert.equal(result.remainingCount, 0);
  assert.equal(result.abortedByNetwork, false);
  assert.deepEqual(calls, ['create:AIR-KKY-001', 'condition:srv-999:rusak_berat']);

  const cachedFacilities = JSON.parse(storage.getItem(facilitiesKey) ?? '[]') as WaterFacility[];
  assert.equal(cachedFacilities[0].id, 'srv-999');
  const cachedLogs = JSON.parse(storage.getItem(logsKey) ?? '[]') as Array<{ facility_id: string }>;
  assert.equal(cachedLogs[0].facility_id, 'srv-999');
});

test('flushOfflineQueue menahan sisa antrean saat putus jaringan, tapi melepas item konflik validasi tanpa memblokir item berikutnya', async () => {
  const storage = createMemoryStorage();
  enqueueCreateFacility('t1', makeFacilityInput({ code: 'AIR-001' }), storage);
  enqueueCreateFacility('t2', makeFacilityInput({ code: 'AIR-002' }), storage);

  const networkDropAdapter: RemoteSyncAdapter = {
    async createFacility() {
      throw new TypeError('Failed to fetch');
    },
    async updateFacility() {
      throw new Error('unused');
    },
    async updateFacilityCondition() {
      throw new Error('unused');
    },
    async updateDusunInfo() {
      throw new Error('unused');
    },
    async deleteFacility() {},
  };

  const aborted = await flushOfflineQueue(networkDropAdapter, { storage });
  assert.equal(aborted.abortedByNetwork, true);
  assert.equal(aborted.remainingCount, 2);
  assert.equal(getOfflineQueueCount(storage), 2);

  const partialConflictAdapter: RemoteSyncAdapter = {
    async createFacility(payload) {
      if (payload.code === 'AIR-001') {
        throw new Error('duplicate key value violates unique constraint "water_facilities_code_key"');
      }
      return makeFacilityRow('srv-2', payload);
    },
    async updateFacility() {
      throw new Error('unused');
    },
    async updateFacilityCondition() {
      throw new Error('unused');
    },
    async updateDusunInfo() {
      throw new Error('unused');
    },
    async deleteFacility() {},
  };

  const res = await flushOfflineQueue(partialConflictAdapter, { storage });
  assert.equal(res.abortedByNetwork, false);
  assert.equal(res.syncedCount, 1);
  assert.equal(res.remainingCount, 0);
  assert.equal(res.errors.length, 1);
  assert.match(res.errors[0], /Tambah AIR-001/);

  const conflicts = readSyncConflicts(storage);
  assert.equal(conflicts.length, 1);
  assert.match(conflicts[0].label, /Tambah AIR-001/);
  clearSyncConflicts(storage);
  assert.equal(readSyncConflicts(storage).length, 0);
});

test('writeOfflineQueue melempar error jelas saat kuota penyimpanan penuh', () => {
  const fullStorage: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError: Failed to execute setItem on Storage');
    },
    removeItem: () => {},
  };

  assert.throws(
    () => enqueueCreateFacility('t-full', makeFacilityInput(), fullStorage),
    /Memori offline perangkat penuh/
  );
});

test('flushOfflineQueue menghapus operasi turunan jika create induk ditolak, namun menahan antrean saat gagal autentikasi', async () => {
  const storage = createMemoryStorage();
  enqueueCreateFacility('temp-dup', makeFacilityInput({ code: 'AIR-DUP' }), storage);
  enqueueUpdateCondition(
    {
      facility_id: 'temp-dup',
      condition: 'rusak_ringan',
      condition_notes: 'Kran bocor',
      inspector_name: 'Kasun',
    },
    storage
  );
  enqueueCreateFacility('temp-ok', makeFacilityInput({ code: 'AIR-OK' }), storage);

  const calledCodes: string[] = [];
  let conditionAttempted = false;
  const conflictAdapter: RemoteSyncAdapter = {
    async createFacility(payload) {
      calledCodes.push(payload.code);
      if (payload.code === 'AIR-DUP') {
        throw new Error('duplicate key value violates unique constraint "water_facilities_code_key"');
      }
      return makeFacilityRow('srv-ok', payload);
    },
    async updateFacility() {
      throw new Error('unused');
    },
    async updateFacilityCondition() {
      conditionAttempted = true;
      throw new Error('should not execute child op for rejected localId');
    },
    async updateDusunInfo() {
      throw new Error('unused');
    },
    async deleteFacility() {},
  };

  const result = await flushOfflineQueue(conflictAdapter, { storage });
  assert.equal(conditionAttempted, false);
  assert.deepEqual(calledCodes, ['AIR-DUP', 'AIR-OK']);
  assert.equal(result.syncedCount, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(getOfflineQueueCount(storage), 0);

  // Auth failure must keep queue intact instead of deleting offline work
  enqueueCreateFacility('temp-auth', makeFacilityInput({ code: 'AIR-AUTH' }), storage);
  const authFailAdapter: RemoteSyncAdapter = {
    async createFacility() {
      throw new Error('new row violates row-level security policy for table "water_facilities"');
    },
    async updateFacility() {
      throw new Error('unused');
    },
    async updateFacilityCondition() {
      throw new Error('unused');
    },
    async updateDusunInfo() {
      throw new Error('unused');
    },
    async deleteFacility() {},
  };

  const authResult = await flushOfflineQueue(authFailAdapter, { storage });
  assert.equal(authResult.abortedByAuth, true);
  assert.equal(authResult.abortedByNetwork, false);
  assert.equal(authResult.remainingCount, 1);
  assert.equal(getOfflineQueueCount(storage), 1);
});
