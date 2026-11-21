import { useState, type FormEvent } from 'react';
import { LocateFixed, Pencil, PlusCircle, X } from 'lucide-react';
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
  type WaterFacility,
} from '../types/inventory';
import {
  captureCurrentGpsPosition,
  isValidIndonesianCoordinate,
} from '../utils/geolocation';
import { getSavedInspectorName, saveInspectorName } from '../utils/inspectorPrefs';
import { PhotoUploadControl } from './PhotoUploadControl';

interface AddFacilityModalProps {
  dusunList: Dusun[];
  existingCodes: string[];
  editingFacility?: WaterFacility | null;
  onClose: () => void;
  onCreateFacility: (input: CreateWaterFacilityInput) => Promise<void>;
  onUpdateFacility?: (facilityId: string, input: CreateWaterFacilityInput) => Promise<void>;
}

function computeNextFacilityCode(existingCodes: string[]): string {
  const maxNum = existingCodes.reduce((highest, raw) => {
    const match = raw.trim().toUpperCase().match(/(\d+)$/);
    if (!match) return highest;
    const n = Number.parseInt(match[1], 10);
    return Number.isFinite(n) && n > highest ? n : highest;
  }, 0);
  return `AIR-KKY-${String(maxNum + 1).padStart(3, '0')}`;
}

export function AddFacilityModal({
  dusunList,
  existingCodes,
  editingFacility = null,
  onClose,
  onCreateFacility,
  onUpdateFacility,
}: AddFacilityModalProps) {
  const isEditMode = Boolean(editingFacility);
  const defaultDusunId = editingFacility?.dusun_id ?? dusunList[0]?.id ?? '';

  const [code, setCode] = useState(
    editingFacility?.code ?? computeNextFacilityCode(existingCodes)
  );
  const [name, setName] = useState(editingFacility?.name ?? '');
  const [dusunId, setDusunId] = useState(defaultDusunId);
  const [rt, setRt] = useState(editingFacility?.rt ?? '001');
  const [rw, setRw] = useState(editingFacility?.rw ?? '001');
  const [addressDetail, setAddressDetail] = useState(editingFacility?.address_detail ?? '');
  const [category, setCategory] = useState<FacilityCategory>(
    editingFacility?.category ?? 'sumur_bor'
  );
  const [condition, setCondition] = useState<PhysicalCondition>(
    editingFacility?.condition ?? 'berfungsi_baik'
  );
  const [waterClarity, setWaterClarity] = useState<WaterClarityStatus>(
    editingFacility?.water_clarity ?? 'jernih'
  );
  const [seasonalAvailability, setSeasonalAvailability] =
    useState<SeasonalAvailabilityStatus>(
      editingFacility?.seasonal_availability ?? 'sepanjang_tahun'
    );
  const [conditionNotes, setConditionNotes] = useState(editingFacility?.condition_notes ?? '');
  const [latitude, setLatitude] = useState(
    editingFacility ? String(editingFacility.latitude) : '-7.08920'
  );
  const [longitude, setLongitude] = useState(
    editingFacility ? String(editingFacility.longitude) : '110.46690'
  );
  const [elevationM, setElevationM] = useState(
    editingFacility?.elevation_m !== null && editingFacility?.elevation_m !== undefined
      ? String(editingFacility.elevation_m)
      : '248'
  );
  const [beneficiaryKk, setBeneficiaryKk] = useState(
    editingFacility ? String(editingFacility.beneficiary_kk) : '45'
  );
  const [builtYear, setBuiltYear] = useState(
    editingFacility?.built_year !== null && editingFacility?.built_year !== undefined
      ? String(editingFacility.built_year)
      : '2024'
  );
  const [fundingSource, setFundingSource] = useState(
    editingFacility?.funding_source ?? 'Dana Desa Kalikayen'
  );
  const [managerName, setManagerName] = useState(
    editingFacility?.manager_name ?? 'KP-SPAMS Tirta Kalikayen'
  );
  const [managerPhone, setManagerPhone] = useState(editingFacility?.manager_phone ?? '');
  const [inspectorName, setInspectorName] = useState(
    editingFacility?.last_inspected_by ?? getSavedInspectorName()
  );

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    editingFacility?.photo_url ?? null
  );
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
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
      setGpsStatus(`Titik GPS berhasil diambil (akurasi +- ${coords.accuracy_m} m)`);
    } catch (err) {
      setGpsStatus(null);
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengambil koordinat GPS.');
    } finally {
      setIsGettingGps(false);
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
      saveInspectorName(inspectorName);
      const payload: CreateWaterFacilityInput = {
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
      };

      if (editingFacility && onUpdateFacility) {
        await onUpdateFacility(editingFacility.id, payload);
      } else {
        await onCreateFacility(payload);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data titik air.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[32px] bg-[#F9FBFF] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-float sm:rounded-[32px] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#D0E4FE] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C]">
              {isEditMode ? <Pencil className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#091F5C]">
                {isEditMode
                  ? `Edit Data Titik Air (${editingFacility?.code})`
                  : 'Tambah Titik Fasilitas & Sumber Air'}
              </h2>
              <p className="text-xs text-[#7096D1]">
                {isEditMode
                  ? 'Perbarui data teknis, pengelola, maupun koordinat GPS titik air'
                  : 'Formulir pendataan sarana air bersih Pemerintah Desa Kalikayen'}
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
          {/* Kode & Nama Fasilitas */}
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

          {/* Dusun, RT, RW */}
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

          {/* Kategori & Kondisi */}
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

          {/* Kualitas & Ketersediaan Air */}
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

          {/* Koordinat GPS Otomatis */}
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

          {/* Manfaat KK, Tahun, Sumber Dana */}
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

          {/* Patokan Lokasi & Catatan Kondisi */}
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

          {/* Foto & Penginput */}
          <div className="space-y-3">
            <PhotoUploadControl
              label="Foto Lapangan (Kamera atau Galeri HP)"
              photoDataUrl={photoDataUrl}
              onChangePhoto={setPhotoDataUrl}
              onError={setErrorMsg}
              onBusyChange={setIsCompressingPhoto}
            />
            <div>
              <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                Petugas Pendata *
              </label>
              <input
                type="text"
                required
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Mis. Budi Santoso (Kadus Watukebo)"
                className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-semibold text-[#091F5C] focus:border-[#334DAF] focus:outline-none"
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
              disabled={isSubmitting || isCompressingPhoto}
              className="rounded-full bg-[#334DAF] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#091F5C] disabled:opacity-50"
            >
              {isSubmitting
                ? 'Menyimpan...'
                : isEditMode
                  ? 'Simpan Perubahan'
                  : 'Simpan Titik Air'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}