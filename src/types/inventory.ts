export type FacilityCategory =
  | 'mata_air'
  | 'sumur_bor'
  | 'sumur_gali'
  | 'pamsimas_reservoir'
  | 'kran_umum'
  | 'mck_umum'
  | 'jaringan_pipa'
  | 'pah';

export type PhysicalCondition =
  | 'berfungsi_baik'
  | 'rusak_ringan'
  | 'rusak_berat'
  | 'kering';

export type WaterClarityStatus = 'jernih' | 'keruh' | 'berbau_berasa';

export type SeasonalAvailabilityStatus = 'sepanjang_tahun' | 'musim_hujan_saja';

export interface Dusun {
  id: string;
  code: string;
  name: string;
  head_name: string | null;
  head_phone: string | null;
  total_kk: number;
  created_at: string;
  updated_at: string;
}

export interface WaterFacility {
  id: string;
  code: string;
  name: string;
  dusun_id: string;
  dusun_name?: string;
  rt: string | null;
  rw: string | null;
  address_detail: string | null;
  category: FacilityCategory;
  condition: PhysicalCondition;
  water_clarity: WaterClarityStatus;
  seasonal_availability: SeasonalAvailabilityStatus;
  condition_notes: string | null;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  beneficiary_kk: number;
  built_year: number | null;
  funding_source: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  photo_url: string | null;
  last_inspected_at: string;
  last_inspected_by: string;
  created_at: string;
  updated_at: string;
}

export interface FacilityConditionLog {
  id: string;
  facility_id: string;
  previous_condition: PhysicalCondition | null;
  new_condition: PhysicalCondition;
  notes: string | null;
  photo_url: string | null;
  inspector_name: string;
  inspected_at: string;
}

export interface CreateWaterFacilityInput {
  code: string;
  name: string;
  dusun_id: string;
  rt?: string;
  rw?: string;
  address_detail?: string;
  category: FacilityCategory;
  condition: PhysicalCondition;
  water_clarity: WaterClarityStatus;
  seasonal_availability: SeasonalAvailabilityStatus;
  condition_notes?: string;
  latitude: number;
  longitude: number;
  elevation_m?: number | null;
  beneficiary_kk: number;
  built_year?: number | null;
  funding_source?: string;
  manager_name?: string;
  manager_phone?: string;
  photo_url?: string | null;
  last_inspected_by: string;
}

export interface UpdateConditionInput {
  facility_id: string;
  condition: PhysicalCondition;
  water_clarity?: WaterClarityStatus;
  seasonal_availability?: SeasonalAvailabilityStatus;
  condition_notes: string;
  photo_url?: string | null;
  inspector_name: string;
}

export interface InventorySummaryStats {
  totalFacilities: number;
  berfungsiBaik: number;
  rusakRingan: number;
  rusakBerat: number;
  kering: number;
  totalBeneficiaryKK: number;
}

export const FACILITY_CATEGORY_LABELS: Record<FacilityCategory, string> = {
  mata_air: 'Mata Air Alami',
  sumur_bor: 'Sumur Bor',
  sumur_gali: 'Sumur Gali',
  pamsimas_reservoir: 'Tandon / Reservoir PAMSIMAS',
  kran_umum: 'Kran Umum Warga',
  mck_umum: 'MCK Komunal',
  jaringan_pipa: 'Jaringan Pipa Distribusi',
  pah: 'Penampungan Air Hujan (PAH)',
};

export const PHYSICAL_CONDITION_LABELS: Record<PhysicalCondition, string> = {
  berfungsi_baik: 'Berfungsi Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  kering: 'Kering Musiman',
};

export const WATER_CLARITY_LABELS: Record<WaterClarityStatus, string> = {
  jernih: 'Jernih',
  keruh: 'Keruh',
  berbau_berasa: 'Berbau / Berasa',
};

export const SEASONAL_AVAILABILITY_LABELS: Record<SeasonalAvailabilityStatus, string> = {
  sepanjang_tahun: 'Sepanjang Tahun',
  musim_hujan_saja: 'Musim Hujan Saja',
};
