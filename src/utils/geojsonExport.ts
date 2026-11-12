import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  SEASONAL_AVAILABILITY_LABELS,
  WATER_CLARITY_LABELS,
  type Dusun,
  type PhysicalCondition,
  type WaterFacility,
} from '../types/inventory';

const CONDITION_HEX_MAP: Record<PhysicalCondition, string> = {
  berfungsi_baik: '#10B981',
  rusak_ringan: '#F59E0B',
  rusak_berat: '#EF4444',
  kering: '#64748B',
};

export function buildGeoJsonFeatureCollection(
  facilities: WaterFacility[],
  dusunList: Dusun[],
  appBaseUrl = 'https://si-air-kalikayen.vercel.app'
) {
  const dusunMap = new Map(dusunList.map((d) => [d.id, d.name]));

  const features = facilities.map((item) => {
    const coords: number[] =
      item.elevation_m !== null && item.elevation_m !== undefined
        ? [item.longitude, item.latitude, item.elevation_m]
        : [item.longitude, item.latitude];

    return {
      type: 'Feature' as const,
      id: item.id,
      geometry: {
        type: 'Point' as const,
        coordinates: coords,
      },
      properties: {
        id: item.id,
        kode_titik: item.code,
        nama_sarana: item.name,
        dusun: item.dusun_name ?? dusunMap.get(item.dusun_id) ?? 'Desa Kalikayen',
        rt: item.rt ?? '-',
        rw: item.rw ?? '-',
        alamat_lokasi: item.address_detail ?? '-',
        kategori_kode: item.category,
        jenis_sarana: FACILITY_CATEGORY_LABELS[item.category],
        kondisi_kode: item.condition,
        kondisi_fisik: PHYSICAL_CONDITION_LABELS[item.condition],
        warna_simbol: CONDITION_HEX_MAP[item.condition],
        kualitas_air: WATER_CLARITY_LABELS[item.water_clarity],
        ketersediaan_musiman: SEASONAL_AVAILABILITY_LABELS[item.seasonal_availability],
        catatan_kerusakan: item.condition_notes ?? '-',
        jumlah_kk_pemanfaat: item.beneficiary_kk,
        elevasi_mdpl: item.elevation_m,
        tahun_dibangun: item.built_year,
        sumber_dana: item.funding_source ?? '-',
        pengelola: item.manager_name ?? '-',
        kontak_pengelola: item.manager_phone ?? '-',
        foto_url: item.photo_url ?? null,
        pelapor_terakhir: item.last_inspected_by,
        waktu_lapor: item.last_inspected_at,
        link_lapor_airlog: `${appBaseUrl}/?action=lapor&code=${encodeURIComponent(item.code)}`,
      },
    };
  });

  return {
    type: 'FeatureCollection' as const,
    name: 'Layer_AIRLOG_Sarana_Air_Bersih_Desa_Kalikayen',
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    metadata: {
      project: 'KKN Kelompok 4 Desa Kalikayen - Klaster K4 (Portal Informasi Air Desa & AIRLOG)',
      desa: 'Desa Kalikayen',
      kecamatan: 'Ungaran Timur',
      kabupaten: 'Semarang',
      updated_at: new Date().toISOString(),
      total_features: features.length,
    },
    features,
  };
}

export function exportFacilitiesToGeoJson(
  facilities: WaterFacility[],
  dusunList: Dusun[]
): void {
  const geojson = buildGeoJsonFeatureCollection(facilities, dusunList);
  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Layer_AIRLOG_Desa_Kalikayen_${dateStamp}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
