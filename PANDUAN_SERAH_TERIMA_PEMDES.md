# Panduan Serah Terima & Operasional — AIRLOG Desa Kalikayen

Dokumen ini ditujukan untuk **Perangkat Desa (Pemdes), Admin Desa, dan Kepala Dusun (Kasun)** Desa Kalikayen, Kecamatan Ungaran Timur, Kabupaten Semarang dalam mengoperasikan **AIRLOG Desa Kalikayen** (versi 1.5 / arsitektur Fase 1–3).

---

## 1. Tautan Resmi Aplikasi

- **Portal Web & PWA (HP / Laptop):** https://si-air-kalikayen.vercel.app
- **Unduh APK Android (v1.5):** https://uwntlfrttdwyucmtsdpq.supabase.co/storage/v1/object/public/apk-releases/AIRLOG-Desa-Kalikayen.apk
- **Endpoint GeoJSON WebGIS Publik:** https://si-air-kalikayen.vercel.app/api/geojson
- **Pemeriksaan Kesehatan Server (Keepalive):** https://si-air-kalikayen.vercel.app/api/keepalive

---

## 2. Pembagian Peran & Keamanan Akses

Demi keamanan data induk desa dan privasi nomor WhatsApp pengurus, akses sistem dibagi menjadi **3 tingkat**:

1. **Warga Desa (Tanpa Login)**
   - Bisa membuka peta interaktif, daftar sarana, statistik dusun, dan mengekspor rekap GeoJSON/Excel publik.
   - Nomor HP Kasun & Pengelola **disensor otomatis** (`null` di dashboard publik & `'- (Akses khusus Pemdes)'` di `/api/geojson`) oleh Supabase Edge Function (`airlog-public-portal`) sehingga tidak bocor ke publik.
   - Bisa mengirim **Laporan Kondisi Warga** via tombol **Lapor Kondisi** atau QR Code pada plang titik air (`/?action=lapor`). Laporan warga otomatis tercatat atas nama `Warga: <Nama Pelapor>` dengan jeda anti-spam 60 detik.
   - **Tidak bisa** mengakses database PostgreSQL secara langsung, menambah/mengubah data induk titik air, atau mengubah profil dusun.

2. **Kepala Dusun / Perangkat Desa (`role: pemdes`)**
   - Wajib login via tombol **Masuk Pemdes** (`kasun@kalikayen.desa.id` atau akun Pemdes masing-masing).
   - Dapat melihat nomor kontak WhatsApp Kasun & Pengelola.
   - Dapat **Tambah Titik Air**, **Edit Detail Titik Air**, **Ubah Data Dusun / Kasun**, dan menyinkronkan antrean offline dari lapangan (`offlineQueue`).
   - **Tidak bisa** menghapus titik air permanen (`Hapus` disembunyikan & ditolak oleh RLS Postgres) maupun mengganti file rilis APK.

3. **Admin Desa (`role: admin`)**
   - Memiliki seluruh hak Pemdes ditambah hak **Hapus Titik Air** dan **Kelola Rilis APK** (`apk-releases` di Supabase Storage).

> [!IMPORTANT]
> Setelah serah terima, **segera ganti kata sandi awal** untuk akun `admin@kalikayen.desa.id` dan `kasun@kalikayen.desa.id` melalui menu Supabase Auth Dashboard atau fitur reset sandi. Jangan pernah membagikan file kredensial di repositori publik.

---

## 3. Alur Penggunaan Lapangan (Mode Online & Offline)

1. **Saat Sinyal Ada (Online):**
   - Buka aplikasi/web, klik **Masuk Pemdes** di header atas.
   - Gunakan tombol **Tambah Titik Air** untuk mendata sumur/tandon/kran baru (gunakan tombol GPS agar titik koordinat akurat).
   - Klik **Bagikan QR** / **Cetak Plang QR** untuk menempel kode QR unik di lokasi sarana air sehingga warga cukup memindai QR bila terjadi kerusakan.

2. **Saat Blank Spot / Tanpa Sinyal (Mode Offline — Pemdes):**
   - Pastikan sudah login **sebelum** turun ke area blank spot (sesi Pemdes tersimpan lokal selama token masih aktif).
   - Perubahan tambah/ubah titik air atau kondisi akan masuk ke **Antrean Offline** di perangkat.
   - Saat sinyal kembali pulih, aplikasi menyinkronkan antrean otomatis sesuai urutan (create induk lebih dulu sebelum update turunannya). Jika terjadi penolakan validasi server atau sesi kedaluwarsa, banner **Konflik Sinkronisasi Offline** akan muncul agar petugas tahu penyebabnya tanpa kehilangan antrean yang tertunda.

3. **Saat Warga Melapor Tanpa Login:**
   - Pindai QR plang atau buka `/ ?action=lapor` -> pilih sarana -> pilih kondisi (*Berfungsi Baik / Rusak Ringan / Rusak Berat / Kering*), isi nama pelapor & catatan singkat, sertakan foto bila perlu, lalu kirim.
   - Laporan warga membutuhkan koneksi internet karena dikirim melalui gateway tervalidasi (`airlog-public-portal`).

---

## 4. Pemeliharaan Berkala

- **Keepalive Database:** Vercel Cron (`/api/keepalive`) berjalan berkala setiap 3 hari (`0 0 */3 * *`, pukul 00:00 UTC / 07:00 WIB) untuk mencegah *free-tier auto-pause* pada project Supabase.
- **Pembaruan APK Baru:** Hanya Admin terautentikasi (`role: admin`) yang dapat mengunggah file `AIRLOG-Desa-Kalikayen.apk` versi terbaru ke bucket `apk-releases`.
- **Cadangan Ekspor:** Secara berkala setiap bulan, Admin disarankan mengunduh rekap Excel & GeoJSON dari menu utama sebagai arsip dokumen desa.
