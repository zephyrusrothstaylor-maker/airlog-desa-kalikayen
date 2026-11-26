-- ============================================================================
-- REFERENSI HARDENING KEAMANAN PRODUKSI (SINKRON DENGAN MIGRASI 20261126000001)
-- ============================================================================
-- Kebijakan produksi yang aktif di Supabase AIRLOG Desa Kalikayen:
--   1. Role `anon` & `PUBLIC` dicabut total dari tabel `dusun`, `water_facilities`,
--      `facility_condition_logs`, dan view `v_water_facilities_export`.
--   2. Warga tanpa login membaca rekap tersensor & mengirim laporan warga lewat
--      Supabase Edge Function (`airlog-public-portal`).
--   3. Hanya Pemdes login (`authenticated`) yang mengakses DB; aksi `DELETE` titik
--      air & pengelolaan bucket `apk-releases` dibatasi untuk `app_metadata.role = 'admin'`.
--
-- Lihat skrip migrasi lengkap pada:
--   supabase/migrations/20261126000001_lockdown_auth_and_storage.sql
--
-- Opsional pembersihan lint `multiple_permissive_policies` di Supabase SQL Editor
-- (semua policy lama di bawah ini sudah dinonaktifkan via `USING (false)` / `WITH CHECK (false)`):
-- ============================================================================

DROP POLICY IF EXISTS "Public read access on dusun" ON public.dusun;
DROP POLICY IF EXISTS "App insert on dusun" ON public.dusun;
DROP POLICY IF EXISTS "App update on dusun" ON public.dusun;

DROP POLICY IF EXISTS "Public read access on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "App insert on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "App update on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "App delete on water_facilities" ON public.water_facilities;

DROP POLICY IF EXISTS "Public read access on facility_condition_logs" ON public.facility_condition_logs;
DROP POLICY IF EXISTS "App insert on facility_condition_logs" ON public.facility_condition_logs;

DROP POLICY IF EXISTS "Public upload apk-releases" ON storage.objects;
DROP POLICY IF EXISTS "Public update apk-releases" ON storage.objects;
