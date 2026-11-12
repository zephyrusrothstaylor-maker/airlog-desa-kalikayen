import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, LocateFixed, PlusCircle, X } from 'lucide-react';
import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  SEASONAL_AVAILABILITY_LABELS,
  WATER_CLARITY_LABELS,
  type CreateWaterFacilityInput,
  type Dusun,
  type FacilityCategory,
  type PhysicalCondition,
  type SeasonalAvailabilityStatus,
  type WaterClarityStatus,
} from '../types/inventory';
import {
  captureCurrentGpsPosition,
  isValidIndonesianCoordinate,
} from '../utils/geolocation';
import { compressImageToWebP } from '../utils/imageCompressor';

interface AddFacilityModalProps {
  dusunList: Dusun[];
  existingCount: number;
  onClose: () => void;
  onCreateFacility: (input: CreateWaterFacilityInput) => Promise<void>;
}

export function AddFacilityModal({
  dusunList,
  existingCount,
  onClose,
  onCreateFacility,
}: AddFacilityModalProps) {
  const defaultDusunId = dusunList[0]?.id ?? '';
  const nextNumber = String(existingCount + 1).padStart(3, '0');

  const [code, setCode] = useState(`AIR-KKY-${nextNumber}`);
  const [name, setName] = useState('');
  const [dusunId, setDusunId] = useState(defaultDusunId);
  const [rt, setRt] = useState('001');
  const [rw, setRw] = useState('001');
  const [addressDetail, setAddressDetail] = useState('');
  const [category, setCategory] = useState<FacilityCategory>('sumur_bor');
  const [condition, setCondition] = useState<PhysicalCondition>('berfungsi_baik');
  const [waterClarity, setWaterClarity] = useState<WaterClarityStatus>('jernih');
  const [seasonalAvailability, setSeasonalAvailability] =
    useState<SeasonalAvailabilityStatus>('sepanjang_tahun');
  const [conditionNotes, setConditionNotes] = useState('');
  const [latitude, setLatitude] = useState('-7.08920');
  const [longitude, setLongitude] = useState('110.46690');
  const [elevationM, setElevationM] = useState('248');
  const [beneficiaryKk, setBeneficiaryKk] = useState('45');
  const [builtYear, setBuiltYear] = useState('2024');
  const [fundingSource, setFundingSource] = useState('Dana Desa Kalikayen');
  const [managerName, setManagerName] = useState('KP-SPAMS Tirta Kalikayen');
  const [managerPhone, setManagerPhone] = useState('');
  const [inspectorName, setInspectorName] = useState('Tim KKN & Perangkat Desa Kalikayen');

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoSizeKB, setPhotoSizeKB] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCaptureGps = async () => {
    setIsGettingGps(true);
    setErrorMsg(null);
    setGpsStatus('Mencari sinyal satelit GPS HP...');
    try {
      const coords = await captureCurrentGpsPosition();
      setLatitude(String(coords.latitude));
      setLongitude(String(coords.longitude));
      if (coords.elevation_m !== null) {
        setElevationM(String(coords.elevation_m));
      }
      setGpsStatus(`Titik GPS berhasil diambil (akurasi ±${coords.accuracy_m}m)`);
    } catch (err) {
      setGpsStatus(null);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengambil koordinat GPS.');
    } finally {
      setIsGettingGps(false);
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToWebP(file);
      setPhotoDataUrl(compressed.dataUrl);
      setPhotoSizeKB(compressed.sizeKB);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengompresi foto.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (!isValidIndonesianCoordinate(latNum, lngNum)) {
      setErrorMsg(
        'Koordinat berada di luar batas wilayah Indonesia (Lat: -11.5 s/d 6.5, Lng: 94.5 s/d 141.5).'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onCreateFacility({
        code,
        name,
        dusun_id: dusunId,
        rt,
        rw,
        address_detail: addressDetail,
        category,
        condition,
        water_clarity: waterClarity,
        seasonal_availability: seasonalAvailability,
        condition_notes: conditionNotes,
        latitude: latNum,
        longitude: lngNum,
        elevation_m: elevationM ? Number(elevationM) : null,
        beneficiary_kk: Number(beneficiaryKk) || 0,
        built_year: builtYear ? Number(builtYear) : null,
        funding_source: fundingSource,
        manager_name: managerName,
        manager_phone: managerPhone,
        photo_url: photoDataUrl,
        last_inspected_by: inspectorName,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menambahkan titik air.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] bg-[#F9FBFF] p-5 shadow-float sm:rounded-[32px] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#D0E4FE] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C]">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#091F5C]">
                Tambah Titik Fasilitas & Sumber Air
              </h2>
              <p className="text-xs text-[#7096D1]">
                Formulir inventarisasi lapangan perangkat desa & KKN
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Kode Plang *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-mono font-bold text-[#091F5C]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Nama Fasilitas / Sumber Air *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Sumur Bor RT 02 Dusun Kalikayen"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-semibold text-[#091F5C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Wilayah Dusun *</label>
              <select
                value={dusunId}
                onChange={(e) => setDusunId(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-bold text-[#091F5C]"
              >
                {dusunList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">RT</label>
              <input
                type="text"
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">RW</label>
              <input
                type="text"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Jenis Fasilitas Air *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FacilityCategory)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-semibold text-[#091F5C]"
              >
                {(Object.keys(FACILITY_CATEGORY_LABELS) as FacilityCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {FACILITY_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Kondisi Fisik Saat Ini *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as PhysicalCondition)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-bold text-[#091F5C]"
              >
                {(Object.keys(PHYSICAL_CONDITION_LABELS) as PhysicalCondition[]).map((cond) => (
                  <option key={cond} value={cond}>
                    {PHYSICAL_CONDITION_LABELS[cond]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Kualitas Air</label>
              <select
                value={waterClarity}
                onChange={(e) => setWaterClarity(e.target.value as WaterClarityStatus)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
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
                Ketersediaan Musiman
              </label>
              <select
                value={seasonalAvailability}
                onChange={(e) =>
                  setSeasonalAvailability(e.target.value as SeasonalAvailabilityStatus)
                }
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
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

          <div className="rounded-2xl border border-[#D0E4FE] bg-[#E8F2FE] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#091F5C]">
                Titik Koordinat Lokasi (GPS)
              </span>
              <button
                type="button"
                onClick={() => void handleCaptureGps()}
                disabled={isGettingGps}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#091F5C]"
              >
                <LocateFixed className="h-3.5 w-3.5" />
                {isGettingGps ? 'Mencari GPS...' : 'Ambil Koordinat GPS HP Saya'}
              </button>
            </div>

            {gpsStatus && (
              <p className="mt-1.5 text-[11px] font-semibold text-emerald-800">{gpsStatus}</p>
            )}

            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-[#334DAF]">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-[#D0E4FE] bg-white px-2.5 py-1.5 font-mono text-xs text-[#091F5C]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#334DAF]">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-[#D0E4FE] bg-white px-2.5 py-1.5 font-mono text-xs text-[#091F5C]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#334DAF]">Elevasi (mdpl)</label>
                <input
                  type="number"
                  step="any"
                  value={elevationM}
                  onChange={(e) => setElevationM(e.target.value)}
                  className="mt-0.5 w-full rounded-xl border border-[#D0E4FE] bg-white px-2.5 py-1.5 font-mono text-xs text-[#091F5C]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">KK Pemanfaat *</label>
              <input
                type="number"
                min={0}
                required
                value={beneficiaryKk}
                onChange={(e) => setBeneficiaryKk(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-bold text-[#091F5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Tahun Dibangun</label>
              <input
                type="number"
                value={builtYear}
                onChange={(e) => setBuiltYear(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Sumber Dana</label>
              <input
                type="text"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
                placeholder="Dana Desa / PAMSIMAS"
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Patokan Lokasi</label>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Mis. Belakang Masjid Al-Ikhlas"
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Pengelola & No. WA
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Nama Pengurus"
                  className="w-1/2 rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
                />
                <input
                  type="text"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-1/2 rounded-2xl border border-[#D0E4FE] bg-white px-3 py-2 text-xs text-[#091F5C]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#091F5C]">
              Catatan Kondisi Fisik
            </label>
            <input
              type="text"
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              placeholder="Contoh: Bangunan bak penampungan bersih, aliran lancar..."
              className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs text-[#091F5C]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">Foto Lapangan</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[#7096D1] bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] hover:bg-[#D0E4FE]">
                <Camera className="h-4 w-4 text-[#334DAF]" />
                {photoSizeKB ? `Foto Siap (${photoSizeKB} KB)` : 'Unggah Foto Kamera'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => void handlePhotoUpload(e)}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Petugas Pendata *
              </label>
              <input
                type="text"
                required
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-semibold text-[#091F5C]"
              />
            </div>
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
              className="rounded-full bg-[#E8F2FE] px-5 py-2.5 text-xs font-bold text-[#091F5C]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#334DAF] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#091F5C] disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Titik Air'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
