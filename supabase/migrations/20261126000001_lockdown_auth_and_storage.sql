-- ============================================================================
-- SECURITY LOCKDOWN: PEMDES AUTHENTICATED ACCESS ONLY + STORAGE HARDENING
-- PROJECT : AIRLOG Desa Kalikayen (si-air-kalikayen)
-- DESKRIPSI:
--   1. Mencabut seluruh akses langsung role `anon` & `PUBLIC` dari tabel/view DB
--      sehingga hanya akun Perangkat Desa (`authenticated`) yang bisa mengakses DB.
--   2. Akses baca warga tanpa login & pelaporan QR warga diarahkan lewat
--      Supabase Edge Function (`airlog-public-portal`) yang menyensor kontak WA.
--   3. Menutup celah upload/overwrite anonim pada bucket `apk-releases`.
-- ============================================================================

BEGIN;

-- 1. Kunci search_path fungsi trigger terhadap search_path hijacking
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.log_facility_condition_change() SET search_path = public;

-- 2. Pastikan view export mengikuti RLS pemanggil (Postgres 15+)
ALTER VIEW public.v_water_facilities_export SET (security_invoker = true);

-- 3. Cabut hak akses langsung anon/PUBLIC dan tetapkan hak minimal authenticated
REVOKE ALL ON TABLE
  public.dusun,
  public.water_facilities,
  public.facility_condition_logs,
  public.v_water_facilities_export
FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE ON TABLE public.dusun TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.water_facilities TO authenticated;
GRANT SELECT, INSERT ON TABLE public.facility_condition_logs TO authenticated;
GRANT SELECT ON TABLE public.v_water_facilities_export TO authenticated;

-- 4. Pastikan RLS aktif
ALTER TABLE public.dusun ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_condition_logs ENABLE ROW LEVEL SECURITY;

-- 5. Hapus seluruh policy lama (anon maupun public read)
DROP POLICY IF EXISTS "Public read access on dusun" ON public.dusun;
DROP POLICY IF EXISTS "App insert on dusun" ON public.dusun;
DROP POLICY IF EXISTS "App update on dusun" ON public.dusun;
DROP POLICY IF EXISTS "Authenticated select on dusun" ON public.dusun;
DROP POLICY IF EXISTS "Authenticated insert on dusun" ON public.dusun;
DROP POLICY IF EXISTS "Authenticated update on dusun" ON public.dusun;

DROP POLICY IF EXISTS "Public read access on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "App insert on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "App update on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "App delete on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "Authenticated select on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "Authenticated insert on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "Authenticated update on water_facilities" ON public.water_facilities;
DROP POLICY IF EXISTS "Admin delete on water_facilities" ON public.water_facilities;

DROP POLICY IF EXISTS "Public read access on facility_condition_logs" ON public.facility_condition_logs;
DROP POLICY IF EXISTS "App insert on facility_condition_logs" ON public.facility_condition_logs;
DROP POLICY IF EXISTS "Authenticated select on facility_condition_logs" ON public.facility_condition_logs;
DROP POLICY IF EXISTS "Authenticated insert on facility_condition_logs" ON public.facility_condition_logs;

-- 6. Policy baru: hanya Pemdes terautentikasi yang dapat membaca/menulis DB
CREATE POLICY "Authenticated select on dusun"
  ON public.dusun FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated insert on dusun"
  ON public.dusun FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated update on dusun"
  ON public.dusun FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated select on water_facilities"
  ON public.water_facilities FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated insert on water_facilities"
  ON public.water_facilities FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated update on water_facilities"
  ON public.water_facilities FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Hapus titik air dibatasi strictly untuk admin via app_metadata.role
CREATE POLICY "Admin delete on water_facilities"
  ON public.water_facilities FOR DELETE
  TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Authenticated select on facility_condition_logs"
  ON public.facility_condition_logs FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated insert on facility_condition_logs"
  ON public.facility_condition_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- 7. Amankan bucket Storage apk-releases (SELECT publik untuk download, tulis/ubah hanya Admin)
DROP POLICY IF EXISTS "Public upload apk-releases" ON storage.objects;
DROP POLICY IF EXISTS "Public update apk-releases" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload apk-releases" ON storage.objects;
DROP POLICY IF EXISTS "Admin update apk-releases" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete apk-releases" ON storage.objects;

CREATE POLICY "Admin upload apk-releases"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'apk-releases'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin update apk-releases"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'apk-releases'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id = 'apk-releases'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin delete apk-releases"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'apk-releases'
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

COMMIT;
