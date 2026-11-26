import { createClient } from '@supabase/supabase-js';

declare const process: {
  env: Record<string, string | undefined>;
};

const SUPABASE_PORTAL_URL =
  'https://uwntlfrttdwyucmtsdpq.supabase.co/functions/v1/airlog-public-portal';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

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

const CONDITION_HEX_COLORS: Record<string, string> = {
  berfungsi_baik: '#10B981',
  rusak_ringan: '#F59E0B',
  rusak_berat: '#EF4444',
  kering: '#64748B',
};

const WATER_CLARITY_LABELS: Record<string, string> = {
  jernih: 'Jernih',
  keruh: 'Keruh',
  berbau_berasa: 'Berbau / Berasa',
};

const SEASONAL_AVAILABILITY_LABELS: Record<string, string> = {
  sepanjang_tahun: 'Sepanjang Tahun',
  musim_hujan_saja: 'Musim Hujan Saja',
};

interface DbFacilityRow {
  id: string;
  code: string;
  name: string;
  dusun_id: string;
  rt: string | null;
  rw: string | null;
  address_detail: string | null;
  category: string;
  condition: string;
  water_clarity: string;
  seasonal_availability: string;
  condition_notes: string | null;
  latitude: number;
  longitude: number;
  elevation_m: number | null;
  beneficiary_kk: number;
  built_year: number | null;
  funding_source: string | null;
  manager_name: string | null;
  photo_url: string | null;
  last_inspected_at: string;
  last_inspected_by: string;
}

function readServerEnv(name: string): string | undefined {
  return typeof process !== 'undefined' ? process.env[name] : undefined;
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  const reqUrl = new URL(request.url);
  const dusunFilter = reqUrl.searchParams.get('dusun')?.trim() ?? '';
  const conditionFilter = reqUrl.searchParams.get('condition')?.trim() ?? '';

  const serviceKey =
    readServerEnv('SUPABASE_SERVICE_ROLE_KEY') || readServerEnv('SUPABASE_SECRET_KEY');
  const supabaseUrl =
    readServerEnv('VITE_SUPABASE_URL') ||
    readServerEnv('SUPABASE_URL') ||
    'https://uwntlfrttdwyucmtsdpq.supabase.co';

  if (serviceKey && supabaseUrl) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const [{ data: dusunRows, error: dErr }, { data: facilityRows, error: fErr }] =
        await Promise.all([
          supabase.from('dusun').select('id, code, name'),
          supabase
            .from('water_facilities')
            .select(
              'id, code, name, dusun_id, rt, rw, address_detail, category, condition, water_clarity, seasonal_availability, condition_notes, latitude, longitude, elevation_m, beneficiary_kk, built_year, funding_source, manager_name, photo_url, last_inspected_at, last_inspected_by'
            )
            .order('code', { ascending: true }),
        ]);

      if (dErr) throw dErr;
      if (fErr) throw fErr;

      const dusunNameById = new Map<string, string>();
      const dusunCodeById = new Map<string, string>();
      for (const row of dusunRows ?? []) {
        dusunNameById.set(row.id, row.name);
        dusunCodeById.set(row.id, String(row.code).toUpperCase());
      }

      const dusunUpper = dusunFilter.toUpperCase();
      const condLower = conditionFilter.toLowerCase();

      const filtered = ((facilityRows ?? []) as DbFacilityRow[]).filter((item) => {
        if (dusunUpper) {
          const dCode = dusunCodeById.get(item.dusun_id) ?? '';
          const dName = (dusunNameById.get(item.dusun_id) ?? '').toUpperCase();
          if (dCode !== dusunUpper && !dName.includes(dusunUpper)) return false;
        }
        if (condLower && item.condition !== condLower) return false;
        return true;
      });

      const appOrigin = reqUrl.origin.startsWith('https://')
        ? reqUrl.origin
        : 'https://si-air-kalikayen.vercel.app';

      const features = filtered.map((item) => {
        const coords: number[] =
          item.elevation_m !== null && item.elevation_m !== undefined
            ? [item.longitude, item.latitude, item.elevation_m]
            : [item.longitude, item.latitude];

        return {
          type: 'Feature',
          id: item.id,
          geometry: { type: 'Point', coordinates: coords },
          properties: {
            id: item.id,
            kode_titik: item.code,
            nama_sarana: item.name,
            dusun: dusunNameById.get(item.dusun_id) ?? 'Desa Kalikayen',
            rt: item.rt ?? '-',
            rw: item.rw ?? '-',
            alamat_lokasi: item.address_detail ?? '-',
            kategori_kode: item.category,
            jenis_sarana: CATEGORY_LABELS[item.category] ?? item.category,
            kondisi_kode: item.condition,
            kondisi_fisik: CONDITION_LABELS[item.condition] ?? item.condition,
            warna_simbol: CONDITION_HEX_COLORS[item.condition] ?? '#334DAF',
            kualitas_air: WATER_CLARITY_LABELS[item.water_clarity] ?? item.water_clarity,
            ketersediaan_musiman:
              SEASONAL_AVAILABILITY_LABELS[item.seasonal_availability] ?? item.seasonal_availability,
            catatan_kerusakan: item.condition_notes ?? '-',
            jumlah_kk_pemanfaat: item.beneficiary_kk,
            elevasi_mdpl: item.elevation_m,
            tahun_dibangun: item.built_year,
            sumber_dana: item.funding_source ?? '-',
            pengelola: item.manager_name ?? '-',
            kontak_pengelola: '- (Akses khusus Pemdes)',
            foto_url: item.photo_url ?? null,
            pelapor_terakhir: item.last_inspected_by,
            waktu_lapor: item.last_inspected_at,
            link_lapor_airlog: `${appOrigin}/?action=lapor&code=${encodeURIComponent(item.code)}`,
          },
        };
      });

      return new Response(
        JSON.stringify({
          type: 'FeatureCollection',
          name: 'Layer_AIRLOG_Sarana_Air_Bersih_Desa_Kalikayen',
          crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
          metadata: {
            project: 'Portal Informasi Air Desa Kalikayen - AIRLOG Pemerintah Desa',
            desa: 'Desa Kalikayen',
            kecamatan: 'Ungaran Timur',
            kabupaten: 'Semarang',
            updated_at: new Date().toISOString(),
            total_features: features.length,
          },
          features,
        }),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/geo+json; charset=utf-8',
            'Cache-Control': 's-maxage=15, stale-while-revalidate=60',
          },
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: 'Gagal memuat layer GeoJSON dari Supabase', detail: message }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
        }
      );
    }
  }

  try {
    const gatewayUrl = new URL(SUPABASE_PORTAL_URL);
    gatewayUrl.searchParams.set('action', 'geojson');
    if (dusunFilter) gatewayUrl.searchParams.set('dusun', dusunFilter);
    if (conditionFilter) gatewayUrl.searchParams.set('condition', conditionFilter);

    const upstream = await fetch(gatewayUrl.toString());
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': upstream.ok
          ? 'application/geo+json; charset=utf-8'
          : 'application/json; charset=utf-8',
        'Cache-Control': upstream.ok ? 's-maxage=15, stale-while-revalidate=60' : 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Gagal menghubungi portal GeoJSON Desa', detail: message }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
