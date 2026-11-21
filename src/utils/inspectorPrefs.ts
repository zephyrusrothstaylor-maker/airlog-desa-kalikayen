const INSPECTOR_STORAGE_KEY = 'airlog_last_inspector_name';
const DEFAULT_INSPECTOR_NAME = 'Perangkat Desa Kalikayen';

/**
 * Mengambil nama petugas pemeriksa terakhir yang disimpan agar operator desa
 * tidak perlu mengetik ulang namanya setiap kali menginput atau memperbarui titik air.
 */
export function getSavedInspectorName(): string {
  try {
    const saved = window.localStorage.getItem(INSPECTOR_STORAGE_KEY)?.trim();
    return saved || DEFAULT_INSPECTOR_NAME;
  } catch {
    return DEFAULT_INSPECTOR_NAME;
  }
}

/**
 * Menyimpan nama petugas pemeriksa ke localStorage untuk pengisian formulir berikutnya.
 */
export function saveInspectorName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    window.localStorage.setItem(INSPECTOR_STORAGE_KEY, trimmed);
  } catch {
    // Abaikan error penyimpanan lokal
  }
}
