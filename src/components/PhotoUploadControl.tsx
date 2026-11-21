import { useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { compressImageToWebP } from '../utils/imageCompressor';

interface PhotoUploadControlProps {
  label?: string;
  photoDataUrl: string | null;
  onChangePhoto: (nextDataUrl: string | null) => void;
  onError?: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Kontrol unggah foto terpadu dengan pilihan Kamera HP maupun Galeri,
 * kompresi WebP otomatis <= 150 KB, serta pratinjau hasil foto.
 */
export function PhotoUploadControl({
  label = 'Foto Dokumentasi Lapangan (Otomatis Kompres WebP <= 150 KB)',
  photoDataUrl,
  onChangePhoto,
  onError,
  onBusyChange,
}: PhotoUploadControlProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoSizeKB, setPhotoSizeKB] = useState<number | null>(null);

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsCompressing(true);
    onBusyChange?.(true);
    try {
      const compressed = await compressImageToWebP(file);
      onChangePhoto(compressed.dataUrl);
      setPhotoSizeKB(compressed.sizeKB);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Gagal memproses foto lapangan.');
    } finally {
      setIsCompressing(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-[#091F5C]">{label}</label>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-dashed border-[#7096D1] bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#D0E4FE]">
          {isCompressing ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#334DAF]" />
          ) : (
            <Camera className="h-4 w-4 text-[#334DAF]" />
          )}
          {isCompressing ? 'Mengompres...' : 'Ambil Kamera'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={isCompressing}
            onChange={(e) => void handleFileSelected(e)}
            className="hidden"
          />
        </label>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-bold text-[#334DAF] transition hover:bg-[#E8F2FE]">
          <ImagePlus className="h-4 w-4" />
          Pilih Galeri
          <input
            type="file"
            accept="image/*"
            disabled={isCompressing}
            onChange={(e) => void handleFileSelected(e)}
            className="hidden"
          />
        </label>

        {photoSizeKB !== null && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            Siap ({photoSizeKB} KB)
          </span>
        )}
      </div>

      {photoDataUrl && (
        <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-[#D0E4FE] bg-white p-2">
          <img
            src={photoDataUrl}
            alt="Preview dokumentasi lapangan"
            className="h-16 w-24 rounded-xl border border-[#E8F2FE] object-cover"
          />
          <div className="flex flex-1 items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#334DAF]">
              Foto tersimpan untuk laporan
            </span>
            <button
              type="button"
              onClick={() => {
                onChangePhoto(null);
                setPhotoSizeKB(null);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
            >
              <Trash2 className="h-3 w-3" />
              Hapus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}