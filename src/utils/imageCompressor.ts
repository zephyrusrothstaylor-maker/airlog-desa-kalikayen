export interface CompressedImageResult {
  dataUrl: string;
  blob: Blob;
  sizeKB: number;
  width: number;
  height: number;
}

const MAX_DIMENSION_PX = 1280;
const TARGET_MAX_BYTES = 150 * 1024;

export async function compressImageToWebP(file: File): Promise<CompressedImageResult> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
    const ratio = Math.min(MAX_DIMENSION_PX / width, MAX_DIMENSION_PX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar Canvas 2D.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.8;
  let blob: Blob | null = null;

  while (quality >= 0.4) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', quality)
    );
    if (blob && blob.size <= TARGET_MAX_BYTES) {
      break;
    }
    quality -= 0.15;
  }

  if (!blob) {
    throw new Error('Gagal mengompresi foto lapangan.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca hasil kompresi gambar.'));
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    blob,
    sizeKB: Math.round((blob.size / 1024) * 10) / 10,
    width,
    height,
  };
}
