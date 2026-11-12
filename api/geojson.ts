import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

const DEFAULT_SUPABASE_URL = 'https://uwntlfrttdwyucmtsdpq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bnRsZnJ0dGR3eXVjbXRzZHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNDEwODcsImV4cCI6MjEwOTkxNzA4N30.PlYUsFXHXkSuS4Tk06u9RGdLR4LdDrKc2IszK3ogoug';

const CATEGORY_LABELS: Record<string, string> = {
  mata_air: 'Mata Air Alami',
  sumur_bor: 'Sumur Bor',
  sumur_gali: 'Sumur Gali',
  pamsimas_reservoir: 'Tandon / Reservoir PAMSIMAS',
  kran_umum: 'Kran Umum Warga',
  mck_umum: 'MCK Komunal',
  jaringan_pipa: 'Jaringan Pipa Distribusi',
  pah: 'Penampungan Air Hujan (PAH)',
};

const CONDITION_LABELS: Record<string, string> = {
  berfungsi_baik: 'Berfungsi Baik',
  rusak_ringan: 'Rusak Ringan',
  rusak_berat: 'Rusak Berat',
  kering: 'Kering Musiman',
};

const CONDITION_COLORS: Record<string, string> = {
  berfungsi_baik: '#10B981',
  rusak_ringan: '#F59E0B',
  rusak_berat: '#EF4444',
  kering: '#64748B',
};

interface ApiRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface ApiResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/geo+json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const [{ data: dusunData }, { data: facilityData, error }] = await Promise.all([
      supabase.from('dusun').select('id, code, name'),
      supabase.from('water_facilities').select('*').order('code', { ascending: true }),
    ]);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const dusunMap = new Map(
      (dusunData ?? []).map((d: { id: string; name: string }) => [d.id, d.name])
    );

    const features = (facilityData ?? []).map((item: Record<string, unknown>) => {
      const condition = String(item.condition ?? 'berfungsi_baik');
      const category = String(item.category ?? 'sumur_bor');
      const code = String(item.code ?? '');
      const lng = Number(item.longitude ?? 110.4669);
      const lat = Number(item.latitude ?? -7.0892);
      const elev =
        item.elevation_m !== null && item.elevation_m !== undefined
          ? Number(item.elevation_m)
          : null;

      return {
        type: 'Feature',
        id: item.id,
        geometry: {
          type: 'Point',
          coordinates: elev !== null ? [lng, lat, elev] : [lng, lat],
        },
        properties: {
          id: item.id,
          kode_titik: code,
          nama_sarana: item.name,
          dusun_id: item.dusun_id,
          dusun: dusunMap.get(String(item.dusun_id)) ?? 'Desa Kalikayen',
          rt: item.rt ?? '-',
          rw: item.rw ?? '-',
          alamat_lokasi: item.address_detail ?? '-',
          kategori_kode: category,
          jenis_sarana: CATEGORY_LABELS[category] ?? category,
          kondisi_kode: condition,
          kondisi_fisik: CONDITION_LABELS[condition] ?? condition,
          warna_simbol: CONDITION_COLORS[condition] ?? '#334DAF',
          kualitas_air: item.water_clarity ?? 'jernih',
          ketersediaan_musiman: item.seasonal_availability ?? 'sepanjang_tahun',
          catatan_kerusakan: item.condition_notes ?? '-',
          jumlah_kk_pemanfaat: Number(item.beneficiary_kk ?? 0),
          elevasi_mdpl: elev,
          tahun_dibangun: item.built_year ?? null,
          sumber_dana: item.funding_source ?? '-',
          pengelola: item.manager_name ?? '-',
          kontak_pengelola: item.manager_phone ?? '-',
          foto_url: item.photo_url ?? null,
          pelapor_terakhir: item.last_inspected_by ?? 'Masyarakat / Tim KKN',
          waktu_lapor: item.last_inspected_at,
          link_lapor_airlog: `https://si-air-kalikayen.vercel.app/?action=lapor&code=${encodeURIComponent(code)}`,
        },
      };
    });

    const geojson = {
      type: 'FeatureCollection',
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

    res.status(200).json(geojson);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal Server Error',
    });
  }
}
