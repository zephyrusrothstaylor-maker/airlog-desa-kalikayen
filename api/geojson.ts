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

const WATER_CLARITY_LABELS: Record<string, string> = {
  jernih: 'Jernih (Baik)',
  keruh: 'Agak Keruh / Berwarna',
  berbau_berasa: 'Berbau / Berasa',
};

const SEASONAL_AVAILABILITY_LABELS: Record<string, string> = {
  sepanjang_tahun: 'Tersedia Sepanjang Tahun',
  musim_hujan_saja: 'Hanya Saat Musim Hujan',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function readServerEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  const supabaseUrl =
    readServerEnv('VITE_SUPABASE_URL') || readServerEnv('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    readServerEnv('VITE_SUPABASE_ANON_KEY') ||
    readServerEnv('SUPABASE_ANON_KEY') ||
    DEFAULT_SUPABASE_ANON_KEY;

  const { searchParams } = new URL(request.url);
  const dusunFilter = searchParams.get('dusun')?.trim() || '';
  const conditionFilter = searchParams.get('condition')?.trim() || '';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const [{ data: dusunData }, { data: facilityData, error }] = await Promise.all([
      supabase.from('dusun').select('id, code, name'),
      supabase.from('water_facilities').select('*').order('code', { ascending: true }),
    ]);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const dusunRows = (dusunData ?? []) as Array<{ id: string; code: string; name: string }>;
    const dusunMap = new Map(dusunRows.map((d) => [d.id, d.name]));
    const dusunCodeMap = new Map(dusunRows.map((d) => [d.id, d.code]));

    const filteredRows = (facilityData ?? []).filter((item: Record<string, unknown>) => {
      if (dusunFilter) {
        const dId = String(item.dusun_id ?? '');
        const dCode = dusunCodeMap.get(dId) ?? '';
        const dName = dusunMap.get(dId) ?? '';
        const q = dusunFilter.toLowerCase();
        if (dId.toLowerCase() !== q && dCode.toLowerCase() !== q && dName.toLowerCase() !== q) {
          return false;
        }
      }
      if (conditionFilter && String(item.condition ?? '') !== conditionFilter) {
        return false;
      }
      return true;
    });

    const features = filteredRows.map((item: Record<string, unknown>) => {
      const condition = String(item.condition ?? 'berfungsi_baik');
      const category = String(item.category ?? 'sumur_bor');
      const waterClarity = String(item.water_clarity ?? 'jernih');
      const seasonalAvailability = String(item.seasonal_availability ?? 'sepanjang_tahun');
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
          kualitas_air: WATER_CLARITY_LABELS[waterClarity] ?? waterClarity,
          ketersediaan_musiman:
            SEASONAL_AVAILABILITY_LABELS[seasonalAvailability] ?? seasonalAvailability,
          catatan_kerusakan: item.condition_notes ?? '-',
          jumlah_kk_pemanfaat: Number(item.beneficiary_kk ?? 0),
          elevasi_mdpl: elev,
          tahun_dibangun: item.built_year ?? null,
          sumber_dana: item.funding_source ?? '-',
          pengelola: item.manager_name ?? '-',
          kontak_pengelola: item.manager_phone ?? '-',
          foto_url: item.photo_url ?? null,
          pelapor_terakhir: item.last_inspected_by ?? 'Perangkat Desa Kalikayen',
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
        project: 'Portal Informasi Air Desa Kalikayen - AIRLOG Pemerintah Desa',
        desa: 'Desa Kalikayen',
        kecamatan: 'Ungaran Timur',
        kabupaten: 'Semarang',
        updated_at: new Date().toISOString(),
        total_features: features.length,
      },
      features,
    };

    return new Response(JSON.stringify(geojson), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Cache-Control': 's-maxage=15, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
