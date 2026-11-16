import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
}): Promise<'shared' | 'downloaded'> {
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

    await Share.share({
      title: filename,
      text: `${dialogTitle} — AIRLOG Desa Kalikayen`,
      url: written.uri,
      dialogTitle,
    });
    return 'shared';
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
