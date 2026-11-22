import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Mengembalikan true jika dialog berbagi dibatalkan oleh pengguna sendiri
 * sehingga aplikasi tidak menampilkan notifikasi error palsu.
 */
export function isShareCancelledError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError') return true;
  const msg = err.message.toLowerCase();
  return msg.includes('cancel') || msg.includes('abort') || msg.includes('dismissed');
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Menyimpan atau membagikan berkas ekspor (.xlsx / .geojson) dengan dukungan
 * Web browser (<a download>) dan Capacitor Native Android (Filesystem + Share sheet).
 */
export async function saveOrShareExportFile(options: {
  filename: string;
  mimeType: string;
  data: string | Uint8Array;
  dialogTitle: string;
}): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const { filename, mimeType, data, dialogTitle } = options;

  if (Capacitor.isNativePlatform()) {
    const base64Data =
      typeof data === 'string'
        ? uint8ArrayToBase64(new TextEncoder().encode(data))
        : uint8ArrayToBase64(data);

    const written = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });

    try {
      await Share.share({
        title: filename,
        text: `${dialogTitle} — AIRLOG Desa Kalikayen`,
        url: written.uri,
        dialogTitle,
      });
      return 'shared';
    } catch (err) {
      if (isShareCancelledError(err)) {
        return 'cancelled';
      }
      throw err;
    }
  }

  const blobPart: BlobPart =
    typeof data === 'string' ? data : new Uint8Array(data).buffer;
  const blob = new Blob([blobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
