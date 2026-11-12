import { SEED_CONDITION_LOGS, SEED_DUSUN, SEED_WATER_FACILITIES } from '../data/seedData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  CreateWaterFacilityInput,
  Dusun,
  FacilityConditionLog,
  InventorySummaryStats,
  UpdateConditionInput,
  WaterFacility,
} from '../types/inventory';

const STORAGE_KEYS = {
  DUSUN: 'si_air_kalikayen_dusun_v3',
  FACILITIES: 'si_air_kalikayen_facilities_v3',
  LOGS: 'si_air_kalikayen_condition_logs_v3',
} as const;

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

function writeLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export async function getDusunList(): Promise<Dusun[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('dusun')
      .select('id, code, name, head_name, head_phone, total_kk, created_at, updated_at')
      .order('code', { ascending: true });

    if (!error && data) {
      return data as Dusun[];
    }
  }

  return readLocal<Dusun[]>(STORAGE_KEYS.DUSUN, SEED_DUSUN);
}

export async function getFacilities(): Promise<WaterFacility[]> {
  const dusunList = await getDusunList();
  const dusunMap = new Map(dusunList.map((d) => [d.id, d.name]));

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('water_facilities')
      .select(
        'id, code, name, dusun_id, rt, rw, address_detail, category, condition, water_clarity, seasonal_availability, condition_notes, latitude, longitude, elevation_m, beneficiary_kk, built_year, funding_source, manager_name, manager_phone, photo_url, last_inspected_at, last_inspected_by, created_at, updated_at'
      )
      .order('code', { ascending: true });

    if (!error && data) {
      return (data as WaterFacility[]).map((item) => ({
        ...item,
        dusun_name: dusunMap.get(item.dusun_id) ?? 'Dusun',
      }));
    }
  }

  const localFacilities = readLocal<WaterFacility[]>(
    STORAGE_KEYS.FACILITIES,
    SEED_WATER_FACILITIES
  );

  return localFacilities.map((item) => ({
    ...item,
    dusun_name: dusunMap.get(item.dusun_id) ?? item.dusun_name ?? 'Dusun',
  }));
}

export async function createFacility(input: CreateWaterFacilityInput): Promise<WaterFacility> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('water_facilities')
      .insert({
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
        last_inspected_by: input.last_inspected_by.trim() || 'Perangkat Desa',
        last_inspected_at: nowIso,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal menyimpan fasilitas ke Supabase: ${error.message}`);
    }
    return data as WaterFacility;
  }

  const dusunList = await getDusunList();
  const dusunName = dusunList.find((d) => d.id === input.dusun_id)?.name ?? 'Dusun';

  const newFacility: WaterFacility = {
    id: crypto.randomUUID(),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    dusun_id: input.dusun_id,
    dusun_name: dusunName,
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
    last_inspected_at: nowIso,
    last_inspected_by: input.last_inspected_by.trim() || 'Perangkat Desa',
    created_at: nowIso,
    updated_at: nowIso,
  };

  const current = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  writeLocal(STORAGE_KEYS.FACILITIES, [newFacility, ...current]);

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
  writeLocal(STORAGE_KEYS.LOGS, [initialLog, ...currentLogs]);

  return newFacility;
}

export async function updateFacilityCondition(
  input: UpdateConditionInput
): Promise<WaterFacility> {
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    const updatePayload: Record<string, unknown> = {
      condition: input.condition,
      condition_notes: input.condition_notes.trim() || null,
      last_inspected_by: input.inspector_name.trim() || 'Perangkat Desa',
      last_inspected_at: nowIso,
    };

    if (input.water_clarity) {
      updatePayload.water_clarity = input.water_clarity;
    }
    if (input.seasonal_availability) {
      updatePayload.seasonal_availability = input.seasonal_availability;
    }
    if (input.photo_url !== undefined) {
      updatePayload.photo_url = input.photo_url;
    }

    const { data, error } = await supabase
      .from('water_facilities')
      .update(updatePayload)
      .eq('id', input.facility_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal memperbarui kondisi fisik: ${error.message}`);
    }
    return data as WaterFacility;
  }

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
  writeLocal(STORAGE_KEYS.FACILITIES, nextFacilities);

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
  writeLocal(STORAGE_KEYS.LOGS, [newLog, ...currentLogs]);

  return updated;
}

export async function deleteFacility(facilityId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('water_facilities').delete().eq('id', facilityId);
    if (error) {
      throw new Error(`Gagal menghapus fasilitas: ${error.message}`);
    }
    return;
  }

  const current = readLocal<WaterFacility[]>(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  writeLocal(
    STORAGE_KEYS.FACILITIES,
    current.filter((item) => item.id !== facilityId)
  );
}

export async function getConditionLogs(facilityId?: string): Promise<FacilityConditionLog[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from('facility_condition_logs')
      .select('id, facility_id, previous_condition, new_condition, notes, photo_url, inspector_name, inspected_at')
      .order('inspected_at', { ascending: false });

    if (facilityId) {
      query = query.eq('facility_id', facilityId);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data as FacilityConditionLog[];
    }
  }

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

export function resetToSeedData(): void {
  writeLocal(STORAGE_KEYS.DUSUN, SEED_DUSUN);
  writeLocal(STORAGE_KEYS.FACILITIES, SEED_WATER_FACILITIES);
  writeLocal(STORAGE_KEYS.LOGS, SEED_CONDITION_LOGS);
}
