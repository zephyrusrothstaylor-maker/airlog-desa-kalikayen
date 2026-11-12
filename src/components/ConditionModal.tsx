import { useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  SunMedium,
  X,
  XCircle,
} from 'lucide-react';
import {
  PHYSICAL_CONDITION_LABELS,
  SEASONAL_AVAILABILITY_LABELS,
  WATER_CLARITY_LABELS,
  type PhysicalCondition,
  type SeasonalAvailabilityStatus,
  type UpdateConditionInput,
  type WaterClarityStatus,
  type WaterFacility,
} from '../types/inventory';
import { compressImageToWebP } from '../utils/imageCompressor';

interface ConditionModalProps {
  facility: WaterFacility | null;
  facilities: WaterFacility[];
  onSelectFacility: (facility: WaterFacility) => void;
  onClose: () => void;
  onOpenAddModal: () => void;
  onSaveCondition: (input: UpdateConditionInput) => Promise<void>;
}

export function ConditionModal({
  facility,
  facilities,
  onSelectFacility,
  onClose,
  onOpenAddModal,
  onSaveCondition,
}: ConditionModalProps) {
  const activeFacility = facility ?? facilities[0] ?? null;

  const [condition, setCondition] = useState<PhysicalCondition>(
    activeFacility?.condition ?? 'berfungsi_baik'
  );
  const [waterClarity, setWaterClarity] = useState<WaterClarityStatus>(
    activeFacility?.water_clarity ?? 'jernih'
  );
  const [seasonalAvailability, setSeasonalAvailability] = useState<SeasonalAvailabilityStatus>(
    activeFacility?.seasonal_availability ?? 'sepanjang_tahun'
  );
  const [notes, setNotes] = useState<string>(activeFacility?.condition_notes ?? '');
  const [inspectorName, setInspectorName] = useState<string>(
    activeFacility?.last_inspected_by ?? 'Perangkat Desa / Tim KKN'
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    activeFacility?.photo_url ?? null
  );
  const [photoSizeKB, setPhotoSizeKB] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!activeFacility) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
        <div className="w-full max-w-md rounded-t-[32px] bg-[#F9FBFF] p-6 text-center shadow-float sm:rounded-[32px]">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C]">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-[#091F5C]">
            Belum Ada Titik Air Terdaftar (0 Data)
          </h2>
          <p className="mt-1.5 text-xs text-[#7096D1]">
            Tambahkan minimal 1 titik fasilitas atau sumber air di Desa Kalikayen terlebih dahulu sebelum menginput laporan kondisi fisik.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#E8F2FE] px-4 py-2.5 text-xs font-bold text-[#091F5C]"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="rounded-full bg-[#334DAF] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#091F5C]"
            >
              + Tambah Titik Air Pertama
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFacilitySwitch = (facilityId: string) => {
    const next = facilities.find((f) => f.id === facilityId);
    if (!next) return;
    onSelectFacility(next);
    setCondition(next.condition);
    setWaterClarity(next.water_clarity);
    setSeasonalAvailability(next.seasonal_availability);
    setNotes(next.condition_notes ?? '');
    setPhotoDataUrl(next.photo_url);
    setPhotoSizeKB(null);
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    setErrorMsg(null);
    try {
      const result = await compressImageToWebP(file);
      setPhotoDataUrl(result.dataUrl);
      setPhotoSizeKB(result.sizeKB);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses foto.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSaveCondition({
        facility_id: activeFacility.id,
        condition,
        water_clarity: waterClarity,
        seasonal_availability: seasonalAvailability,
        condition_notes: notes,
        photo_url: photoDataUrl,
        inspector_name: inspectorName,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan kondisi fisik.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const conditionOptions: Array<{
    value: PhysicalCondition;
    label: string;
    desc: string;
    icon: typeof CheckCircle2;
    activeClass: string;
  }> = [
    {
      value: 'berfungsi_baik',
      label: PHYSICAL_CONDITION_LABELS.berfungsi_baik,
      desc: 'Aliran & bangunan normal',
      icon: CheckCircle2,
      activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/30',
    },
    {
      value: 'rusak_ringan',
      label: PHYSICAL_CONDITION_LABELS.rusak_ringan,
      desc: 'Masih berfungsi sebagian',
      icon: AlertTriangle,
      activeClass: 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/30',
    },
    {
      value: 'rusak_berat',
      label: PHYSICAL_CONDITION_LABELS.rusak_berat,
      desc: 'Tidak berfungsi / mati total',
      icon: XCircle,
      activeClass: 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/30',
    },
    {
      value: 'kering',
      label: PHYSICAL_CONDITION_LABELS.kering,
      desc: 'Surut / kering saat kemarau',
      icon: SunMedium,
      activeClass: 'border-slate-600 bg-slate-100 text-slate-900 ring-2 ring-slate-500/30',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-[#F9FBFF] p-5 shadow-float sm:rounded-[32px] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#D0E4FE] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#091F5C]">
                Input / Update Kondisi Fisik
              </h2>
              <p className="text-xs text-[#7096D1]">
                Catat status terbaru titik fasilitas air di lapangan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full bg-[#E8F2FE] p-2 text-[#091F5C] hover:bg-[#D0E4FE]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          {/* Pilih Titik Air */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[#091F5C]">
              Pilih Titik Fasilitas Air
            </label>
            <select
              value={activeFacility.id}
              onChange={(e) => handleFacilitySwitch(e.target.value)}
              className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2.5 text-sm font-bold text-[#091F5C] focus:border-[#334DAF] focus:outline-none"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  [{f.code}] {f.name} • {f.dusun_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2x2 Touch-Friendly Condition Buttons */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#091F5C]">
              Status Kondisi Fisik Saat Ini *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {conditionOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = condition === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCondition(opt.value)}
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? opt.activeClass
                        : 'border-[#D0E4FE] bg-white text-[#091F5C] hover:bg-[#E8F2FE]'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-extrabold">{opt.label}</span>
                      <Icon className="h-4 w-4 shrink-0" />
                    </div>
                    <span className="mt-1 text-[11px] opacity-80">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kualitas Air & Musim */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Kualitas Air</label>
              <select
                value={waterClarity}
                onChange={(e) => setWaterClarity(e.target.value as WaterClarityStatus)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-semibold text-[#091F5C]"
              >
                {(Object.keys(WATER_CLARITY_LABELS) as WaterClarityStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {WATER_CLARITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Ketersediaan Air
              </label>
              <select
                value={seasonalAvailability}
                onChange={(e) =>
                  setSeasonalAvailability(e.target.value as SeasonalAvailabilityStatus)
                }
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-semibold text-[#091F5C]"
              >
                {(
                  Object.keys(SEASONAL_AVAILABILITY_LABELS) as SeasonalAvailabilityStatus[]
                ).map((k) => (
                  <option key={k} value={k}>
                    {SEASONAL_AVAILABILITY_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catatan Kondisi / Kerusakan */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[#091F5C]">
              Catatan Kondisi Fisik / Detail Kerusakan
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kran utama bocor, pipa PVC 2 inci retak, atau pompa berfungsi normal..."
              className="w-full rounded-2xl border border-[#D0E4FE] bg-white p-3 text-xs text-[#091F5C] placeholder-[#7096D1] focus:border-[#334DAF] focus:outline-none"
            />
          </div>

          {/* Foto Dokumentasi Lapangan (Kompresi WebP Otomatis) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[#091F5C]">
              Foto Kondisi Fisik (Otomatis Kompres WebP &le; 150 KB)
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[#7096D1] bg-[#E8F2FE] px-4 py-2.5 text-xs font-bold text-[#091F5C] transition hover:bg-[#D0E4FE]">
                <Camera className="h-4 w-4 text-[#334DAF]" />
                {isCompressing ? 'Mengompres Foto...' : 'Ambil / Pilih Foto HP'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => void handlePhotoChange(e)}
                  className="hidden"
                />
              </label>
              {photoSizeKB !== null && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  Terkompresi: {photoSizeKB} KB (WebP)
                </span>
              )}
            </div>
            {photoDataUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={photoDataUrl}
                  alt="Preview kondisi"
                  className="h-20 w-28 rounded-xl border border-[#D0E4FE] object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl(null);
                    setPhotoSizeKB(null);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Hapus Foto
                </button>
              </div>
            )}
          </div>

          {/* Nama Pemeriksa */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[#091F5C]">
              Nama Pemeriksa (Perangkat Desa / Mahasiswa KKN) *
            </label>
            <input
              type="text"
              required
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#091F5C] focus:border-[#334DAF] focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#E8F2FE] px-5 py-2.5 text-xs font-bold text-[#091F5C] hover:bg-[#D0E4FE]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="rounded-full bg-[#334DAF] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C] disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kondisi Fisik'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
