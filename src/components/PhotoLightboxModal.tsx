import { X } from 'lucide-react';
import type { PhotoPreviewData } from '../types/inventory';

interface PhotoLightboxModalProps {
  photo: PhotoPreviewData;
  onClose: () => void;
}

/**
 * Penampil foto dokumentasi layar penuh agar perangkat desa dapat mengecek
 * detail kondisi fisik sarana air secara jelas.
 */
export function PhotoLightboxModal({ photo, onClose }: PhotoLightboxModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#091F5C]/92 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#091F5C] shadow-float ring-1 ring-white/20"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-extrabold">{photo.title}</h2>
            {photo.subtitle && (
              <p className="truncate text-[11px] text-[#D0E4FE]">{photo.subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pratinjau foto"
            className="shrink-0 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex max-h-[75dvh] items-center justify-center bg-black/50 p-2">
          <img
            src={photo.src}
            alt={photo.title}
            className="max-h-[72dvh] w-auto rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}