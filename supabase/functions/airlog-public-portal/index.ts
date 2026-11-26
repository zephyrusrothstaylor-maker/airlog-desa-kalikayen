import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

const VALID_CONDITIONS = new Set(['berfungsi_baik', 'rusak_ringan', 'rusak_berat', 'kering']);
const VALID_CLARITIES = new Set(['jernih', 'keruh', 'berbau_berasa']);
const VALID_SEASONS = new Set(['sepanjang_tahun', 'musim_hujan_saja']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_DATA_IMAGE_RE = /^data:image\/(webp|jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/;

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

const CLARITY_LABELS: Record<string, string> = {
  jernih: 'Jernih',
  keruh: 'Keruh',
  berbau_berasa: 'Berbau / Berasa',
};

const SEASON_LABELS: Record<string, string> = {
  sepanjang_tahun: 'Sepanjang Tahun',
  musim_hujan_saja: 'Musim Hujan Saja',
};

function getServiceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (legacy) return legacy;
  const secretJson = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretJson) {
    try {
      const parsed = JSON.parse(secretJson) as Record<string, string>;
      return parsed.default || Object.values(parsed)[0] || '';
    } catch {
      return '';
    }
  }
  return '';
}

function jsonResponse(payload: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function sanitizePublicFacility(
  row: Record<string, unknown>,
  dusunMap: Map<string, string>
): Record<string, unknown> {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    dusun_id: row.dusun_id,
    dusun_name: dusunMap.get(String(row.dusun_id ?? '')) ?? 'Dusun',
    rt: row.rt ?? null,
    rw: row.rw ?? null,
    address_detail: row.address_detail ?? null,
    category: row.category,
    condition: row.condition,
    water_clarity: row.water_clarity,
    seasonal_availability: row.seasonal_availability,
    condition_notes: row.condition_notes ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    elevation_m: row.elevation_m ?? null,
    beneficiary_kk: row.beneficiary_kk ?? 0,
    built_year: row.built_year ?? null,
    funding_source: row.funding_source ?? null,
    manager_name: row.manager_name ?? null,
    manager_phone: null,
    photo_url: row.photo_url ?? null,
    last_inspected_at: row.last_inspected_at,
    last_inspected_by: row.last_inspected_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const PUBLIC_FACILITY_COLUMNS =
  'id, code, name, dusun_id, rt, rw, address_detail, category, condition, water_clarity, seasonal_availability, condition_notes, latitude, longitude, elevation_m, beneficiary_kk, built_year, funding_source, manager_name, photo_url, last_inspected_at, last_inspected_by, created_at, updated_at';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = getServiceKey();
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Konfigurasi server portal publik belum lengkap.' }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? (req.method === 'POST' ? 'report' : 'overview');

  if (req.method === 'GET' && action === 'keepalive') {
    const { count, error } = await adminClient
      .from('dusun')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return jsonResponse({ ok: false, mode: 'supabase', checkedAt: new Date().toISOString(), error: error.message }, 500);
    }
    return jsonResponse({
      ok: true,
      mode: 'supabase',
      checkedAt: new Date().toISOString(),
      dusunCount: count ?? 0,
    });
  }

  if (req.method === 'GET' && action === 'overview') {
    const [dusunRes, facilitiesRes, logsRes] = await Promise.all([
      adminClient
        .from('dusun')
        .select('id, code, name, head_name, total_kk, created_at, updated_at')
        .order('code', { ascending: true }),
      adminClient
        .from('water_facilities')
        .select(PUBLIC_FACILITY_COLUMNS)
        .order('code', { ascending: true }),
      adminClient
        .from('facility_condition_logs')
        .select('id, facility_id, previous_condition, new_condition, notes, photo_url, inspector_name, inspected_at')
        .order('inspected_at', { ascending: false })
        .limit(120),
    ]);

    if (dusunRes.error || facilitiesRes.error || logsRes.error) {
      const msg =
        dusunRes.error?.message ?? facilitiesRes.error?.message ?? logsRes.error?.message ?? 'DB error';
      return jsonResponse({ error: msg }, 500);
    }

    const dusunRows = (dusunRes.data ?? []).map((d) => ({ ...d, head_phone: null }));
    const dusunMap = new Map(dusunRows.map((d) => [String(d.id), String(d.name)]));
    const facilities = (facilitiesRes.data ?? []).map((f) =>
      sanitizePublicFacility(f as Record<string, unknown>, dusunMap)
    );

    return jsonResponse(
      {
        dusun: dusunRows,
        facilities,
        conditionLogs: logsRes.data ?? [],
        fetchedAt: new Date().toISOString(),
      },
      200,
      { 'Cache-Control': 'no-store' }
    );
  }

  if (req.method === 'GET' && action === 'geojson') {
    const dusunParam = (url.searchParams.get('dusun') ?? '').trim().toUpperCase();
    const conditionParam = (url.searchParams.get('condition') ?? '').trim().toLowerCase();

    const [dusunRes, facRes] = await Promise.all([
      adminClient.from('dusun').select('id, code, name'),
      adminClient.from('water_facilities').select(PUBLIC_FACILITY_COLUMNS).order('code', { ascending: true }),
    ]);

    if (dusunRes.error || facRes.error) {
      return jsonResponse({ error: dusunRes.error?.message ?? facRes.error?.message ?? 'DB error' }, 500);
    }

    const dusunRows = dusunRes.data ?? [];
    const dusunNameById = new Map(dusunRows.map((d) => [d.id, d.name]));
    const dusunCodeById = new Map(dusunRows.map((d) => [d.id, String(d.code).toUpperCase()]));
    const appOrigin = 'https://si-air-kalikayen.vercel.app';

    const filtered = (facRes.data ?? []).filter((item) => {
      if (dusunParam) {
        const dCode = dusunCodeById.get(item.dusun_id) ?? '';
        const dName = String(dusunNameById.get(item.dusun_id) ?? '').toUpperCase();
        if (dCode !== dusunParam && !dName.includes(dusunParam)) return false;
      }
      if (conditionParam && String(item.condition) !== conditionParam) {
        return false;
      }
      return true;
    });

    const features = filtered.map((item) => {
      const coords =
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
          kualitas_air: CLARITY_LABELS[item.water_clarity] ?? item.water_clarity,
          ketersediaan_musiman: SEASON_LABELS[item.seasonal_availability] ?? item.seasonal_availability,
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
  }

  if (req.method === 'POST' && action === 'report') {
    let rawText = '';
    try {
      rawText = await req.text();
    } catch {
      return jsonResponse({ error: 'Permintaan tidak terbaca.' }, 400);
    }
    if (rawText.length > 420_000) {
      return jsonResponse({ error: 'Ukuran laporan melebihi batas maksimum.' }, 413);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Format JSON tidak valid.' }, 400);
    }

    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return jsonResponse({ error: 'Permintaan ditolak.' }, 400);
    }

    const facilityId = String(body.facility_id ?? '').trim();
    const condition = String(body.condition ?? '').trim();
    const waterClarity = body.water_clarity ? String(body.water_clarity).trim() : undefined;
    const seasonal = body.seasonal_availability
      ? String(body.seasonal_availability).trim()
      : undefined;
    const notesRaw = String(body.condition_notes ?? '').trim();
    const inspectorRaw = String(body.inspector_name ?? '').trim();
    const photoRaw = body.photo_url;

    if (!UUID_RE.test(facilityId)) {
      return jsonResponse({ error: 'ID titik air tidak valid.' }, 400);
    }
    if (!VALID_CONDITIONS.has(condition)) {
      return jsonResponse({ error: 'Pilihan kondisi fisik tidak valid.' }, 400);
    }
    if (waterClarity && !VALID_CLARITIES.has(waterClarity)) {
      return jsonResponse({ error: 'Pilihan kualitas air tidak valid.' }, 400);
    }
    if (seasonal && !VALID_SEASONS.has(seasonal)) {
      return jsonResponse({ error: 'Pilihan ketersediaan air tidak valid.' }, 400);
    }
    if (inspectorRaw.length < 2 || inspectorRaw.length > 80) {
      return jsonResponse({ error: 'Nama pelapor harus 2 hingga 80 karakter.' }, 400);
    }
    if (notesRaw.length > 500) {
      return jsonResponse({ error: 'Catatan kondisi maksimal 500 karakter.' }, 400);
    }

    const { data: existingFacility, error: findErr } = await adminClient
      .from('water_facilities')
      .select('id, photo_url')
      .eq('id', facilityId)
      .maybeSingle();

    if (findErr || !existingFacility) {
      return jsonResponse({ error: 'Titik fasilitas air tidak ditemukan.' }, 404);
    }

    let sanitizedPhoto: string | null | undefined = undefined;
    if (photoRaw === null) {
      sanitizedPhoto = existingFacility.photo_url ? undefined : null;
    } else if (typeof photoRaw === 'string' && photoRaw.length > 0) {
      if (photoRaw === existingFacility.photo_url) {
        sanitizedPhoto = undefined;
      } else if (photoRaw.length > 320_000 || !SAFE_DATA_IMAGE_RE.test(photoRaw)) {
        return jsonResponse(
          { error: 'Lampiran foto harus berupa gambar terkompresi WebP/JPEG/PNG (maks. ~220 KB).' },
          400
        );
      } else {
        sanitizedPhoto = photoRaw;
      }
    }

    const { data: latestLogs } = await adminClient
      .from('facility_condition_logs')
      .select('new_condition, notes, inspected_at')
      .eq('facility_id', facilityId)
      .order('inspected_at', { ascending: false })
      .limit(1);

    const latest = latestLogs?.[0];
    if (latest) {
      const ageMs = Date.now() - new Date(latest.inspected_at).getTime();
      if (
        ageMs >= 0 &&
        ageMs < 60_000 &&
        latest.new_condition === condition &&
        (latest.notes ?? '') === (notesRaw || '')
      ) {
        return jsonResponse(
          { error: 'Laporan serupa baru saja dikirim. Tunggu 1 menit sebelum mengirim ulang.' },
          429
        );
      }
    }

    const inspectorLabel = inspectorRaw.toLowerCase().startsWith('warga:')
      ? inspectorRaw
      : `Warga: ${inspectorRaw}`;

    const updatePayload: Record<string, unknown> = {
      condition,
      condition_notes: notesRaw || null,
      last_inspected_by: inspectorLabel,
      last_inspected_at: new Date().toISOString(),
    };
    if (waterClarity) updatePayload.water_clarity = waterClarity;
    if (seasonal) updatePayload.seasonal_availability = seasonal;
    if (sanitizedPhoto !== undefined) updatePayload.photo_url = sanitizedPhoto;

    const { data: updatedRow, error: updErr } = await adminClient
      .from('water_facilities')
      .update(updatePayload)
      .eq('id', facilityId)
      .select(PUBLIC_FACILITY_COLUMNS)
      .single();

    if (updErr || !updatedRow) {
      return jsonResponse({ error: updErr?.message ?? 'Gagal memperbarui laporan.' }, 500);
    }

    const { data: dusunList } = await adminClient.from('dusun').select('id, name');
    const dusunMap = new Map((dusunList ?? []).map((d) => [String(d.id), String(d.name)]));

    return jsonResponse(
      { facility: sanitizePublicFacility(updatedRow as Record<string, unknown>, dusunMap) },
      200
    );
  }

  return jsonResponse({ error: 'Endpoint atau metode tidak didukung.' }, 405);
});
