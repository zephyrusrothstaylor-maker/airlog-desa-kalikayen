import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Building2,
  FileJson,
  FileSpreadsheet,
  History,
  Pencil,
  Phone,
  RefreshCw,
  Share2,
  Users,
  X,
} from 'lucide-react';
import {
  PHYSICAL_CONDITION_LABELS,
  type Dusun,
  type FacilityConditionLog,
  type PhotoPreviewData,
  type UpdateDusunInput,
  type WaterFacility,
} from '../types/inventory';
import { buildWhatsappChatUrl } from '../utils/whatsappShare';
import { ConditionBadge } from './ConditionBadge';

interface DusunAnalyticsViewProps {
  dusunList: Dusun[];
  facilities: WaterFacility[];
  conditionLogs: FacilityConditionLog[];
  isSyncing: boolean;
  onExportExcel: () => void;
  onExportGeoJson: () => void;
  onSyncData: () => void;
  onShareVillageRecap: () => void;
  onInspectDusunFacilities?: (dusunId: string) => void;
  onUpdateDusun: (input: UpdateDusunInput) => Promise<void>;
  onPreviewPhoto: (photo: PhotoPreviewData) => void;
}

export function DusunAnalyticsView({
  dusunList,
  facilities,
  conditionLogs,
  isSyncing,
  onExportExcel,
  onExportGeoJson,
  onSyncData,
  onShareVillageRecap,
  onInspectDusunFacilities,
  onUpdateDusun,
  onPreviewPhoto,
}: DusunAnalyticsViewProps) {
  const facilityMap = new Map(facilities.map((f) => [f.id, f]));
  const [editingDusun, setEditingDusun] = useState<Dusun | null>(null);
  const [headName, setHeadName] = useState('');
  const [headPhone, setHeadPhone] = useState('');
  const [totalKk, setTotalKk] = useState('');
  const [isSavingDusun, setIsSavingDusun] = useState(false);
  const [dusunError, setDusunError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingDusun) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEditingDusun(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingDusun]);

  const openEditDusun = (dusun: Dusun) => {
    setEditingDusun(dusun);
    setHeadName(dusun.head_name ?? '');
    setHeadPhone(dusun.head_phone ?? '');
    setTotalKk(String(dusun.total_kk));
    setDusunError(null);
  };

  const handleSaveDusun = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingDusun) return;
    setIsSavingDusun(true);
    setDusunError(null);
    try {
      await onUpdateDusun({
        id: editingDusun.id,
        head_name: headName,
        head_phone: headPhone,
        total_kk: Number(totalKk) || 0,
      });
      setEditingDusun(null);
    } catch (err) {
      setDusunError(err instanceof Error ? err.message : 'Gagal memperbarui data dusun.');
    } finally {
      setIsSavingDusun(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] pb-36">
      <header className="pt-safe-header border-b border-[#D0E4FE] bg-white px-4 pb-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-[#091F5C] sm:text-xl">
              Rekapitulasi Wilayah Dusun & Laporan
            </h1>
            <p className="text-xs font-medium text-[#7096D1]">
              Cakupan layanan air bersih per dusun, data Kadus & riwayat pemeriksaan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSyncData}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D0E4FE] bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#D0E4FE] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#334DAF] ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Memuat...' : 'Sinkron Data'}
            </button>
            <button
              type="button"
              onClick={onShareVillageRecap}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Share2 className="h-3.5 w-3.5" />
              Bagikan Ringkasan WA
            </button>
            <button
              type="button"
              onClick={onExportGeoJson}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D0E4FE] px-4 py-2 text-xs font-bold text-[#091F5C] shadow-sm transition hover:bg-[#7096D1] hover:text-white"
            >
              <FileJson className="h-4 w-4" />
              GeoJSON
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel (.xlsx)
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 pt-6 sm:px-8">
        {/* Per-Dusun Breakdown Grid */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#334DAF]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#091F5C]">
              Kondisi Fasilitas Air Per Dusun
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {dusunList.map((dusun) => {
              const items = facilities.filter((f) => f.dusun_id === dusun.id);
              const baik = items.filter((f) => f.condition === 'berfungsi_baik').length;
              const rusakRingan = items.filter((f) => f.condition === 'rusak_ringan').length;
              const rusakBerat = items.filter((f) => f.condition === 'rusak_berat').length;
              const kering = items.filter((f) => f.condition === 'kering').length;
              const kkServed = items.reduce((sum, f) => sum + (f.beneficiary_kk || 0), 0);
              const coveragePct =
                dusun.total_kk > 0 ? Math.min(100, Math.round((kkServed / dusun.total_kk) * 100)) : 0;

              const kasunWaUrl = buildWhatsappChatUrl(
                dusun.head_phone,
                `Halo ${dusun.head_name ?? 'Kasun'}, koordinasi kondisi sarana air bersih di ${dusun.name}, Desa Kalikayen.`
              );

              return (
                <div
                  key={dusun.id}
                  className="rounded-3xl border border-[#D0E4FE] bg-white p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-lg bg-[#D0E4FE] px-2.5 py-0.5 font-mono text-xs font-bold text-[#091F5C]">
                        {dusun.code}
                      </span>
                      <h3 className="mt-1 text-base font-extrabold text-[#091F5C]">{dusun.name}</h3>
                      <p className="text-xs text-[#7096D1]">
                        Kepala Dusun: <strong className="text-[#091F5C]">{dusun.head_name ?? '-'}</strong>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-1.5">
                      {onInspectDusunFacilities && (
                        <button
                          type="button"
                          onClick={() => onInspectDusunFacilities(dusun.id)}
                          title={`Lihat titik air di ${dusun.name}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#D0E4FE] px-3 py-1.5 text-xs font-bold text-[#091F5C] transition hover:bg-[#334DAF] hover:text-white"
                        >
                          Daftar ({items.length})
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {kasunWaUrl && (
                        <a
                          href={kasunWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          WA Kasun
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditDusun(dusun)}
                        title={`Atur nama Kasun, WA & Total KK ${dusun.name}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#E8F2FE] px-3 py-1.5 text-xs font-bold text-[#334DAF] hover:bg-[#D0E4FE]"
                      >
                        <Pencil className="h-3 w-3" />
                        Atur
                      </button>
                    </div>
                  </div>

                  {/* 4 Mini Condition Counters */}
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div className="rounded-2xl bg-emerald-50 p-2">
                      <span className="block text-lg font-extrabold text-emerald-800">{baik}</span>
                      <span className="text-[10px] font-semibold text-emerald-700">Baik</span>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-2">
                      <span className="block text-lg font-extrabold text-amber-800">
                        {rusakRingan}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700">R. Ringan</span>
                    </div>
                    <div className="rounded-2xl bg-rose-50 p-2">
                      <span className="block text-lg font-extrabold text-rose-800">
                        {rusakBerat}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-700">R. Berat</span>
                    </div>
                    <div className="rounded-2xl bg-slate-100 p-2">
                      <span className="block text-lg font-extrabold text-slate-700">{kering}</span>
                      <span className="text-[10px] font-semibold text-slate-600">Kering</span>
                    </div>
                  </div>

                  {/* KK Coverage Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#091F5C]">
                        <Users className="h-3.5 w-3.5 text-[#334DAF]" />
                        Cakupan KK Pemanfaat
                      </span>
                      <span className="font-bold text-[#334DAF]">
                        {kkServed} / {dusun.total_kk} KK ({coveragePct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#E8F2FE]">
                      <div
                        className="h-full rounded-full bg-[#334DAF] transition-all"
                        style={{ width: `${coveragePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Inspection Audit Log */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-[#334DAF]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#091F5C]">
              Riwayat Pemeriksaan Kondisi Fisik Terbaru ({conditionLogs.length})
            </h2>
          </div>

          {conditionLogs.length === 0 ? (
            <div className="rounded-2xl border border-[#D0E4FE] bg-white p-6 text-center text-xs text-[#7096D1]">
              Belum ada riwayat pemeriksaan kondisi fisik yang tercatat (masih 0 data).
            </div>
          ) : (
            <div className="space-y-3">
              {conditionLogs.slice(0, 12).map((log) => {
                const fac = facilityMap.get(log.facility_id);
                return (
                  <div
                    key={log.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#E8F2FE] bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      {log.photo_url && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewPhoto({
                              src: log.photo_url!,
                              title: `[${fac?.code ?? 'TITIK-AIR'}] ${fac?.name ?? 'Pemeriksaan Lapangan'}`,
                              subtitle: `Diperiksa oleh ${log.inspector_name}`,
                            })
                          }
                          title="Ketuk untuk memperbesar foto"
                          className="shrink-0 overflow-hidden rounded-xl border border-[#D0E4FE] transition hover:ring-2 hover:ring-[#334DAF]"
                        >
                          <img
                            src={log.photo_url}
                            alt={fac?.name ?? 'Dokumentasi pemeriksaan'}
                            className="h-12 w-14 object-cover"
                          />
                        </button>
                      )}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#334DAF]">
                            {fac?.code ?? 'TITIK-AIR'}
                          </span>
                          <span className="text-sm font-bold text-[#091F5C]">
                            {fac?.name ?? 'Fasilitas Air Desa'}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {log.previous_condition &&
                            log.previous_condition !== log.new_condition && (
                              <>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                  {PHYSICAL_CONDITION_LABELS[log.previous_condition]}
                                </span>
                                <ArrowRight className="h-3 w-3 text-[#7096D1]" />
                              </>
                            )}
                          <ConditionBadge condition={log.new_condition} />
                        </div>
                        {log.notes && <p className="mt-1.5 text-xs text-[#091F5C]">{log.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#7096D1]">
                      <span className="block font-semibold text-[#091F5C]">{log.inspector_name}</span>
                      <span>
                        {new Date(log.inspected_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editingDusun && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <form
            onSubmit={(e) => void handleSaveDusun(e)}
            className="pb-safe-modal w-full max-w-md rounded-t-[32px] bg-[#F9FBFF] p-5 shadow-float sm:rounded-[32px] sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-[#D0E4FE] pb-3">
              <div>
                <h2 className="text-base font-extrabold text-[#091F5C]">
                  Atur Data Wilayah {editingDusun.name}
                </h2>
                <p className="text-xs text-[#7096D1]">
                  Perbarui nama Kepala Dusun, nomor WhatsApp aktif & total KK riil
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDusun(null)}
                aria-label="Tutup"
                className="rounded-full bg-[#E8F2FE] p-2 text-[#091F5C] hover:bg-[#D0E4FE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                  Nama Kepala Dusun (Kasun)
                </label>
                <input
                  type="text"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="Mis. Bapak Slamet Riyadi"
                  className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-semibold text-[#091F5C] focus:border-[#334DAF] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                  Nomor WhatsApp Kadus (Aktif)
                </label>
                <input
                  type="tel"
                  value={headPhone}
                  onChange={(e) => setHeadPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs text-[#091F5C] focus:border-[#334DAF] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#091F5C]">
                  Total KK Penduduk Dusun
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={totalKk}
                  onChange={(e) => setTotalKk(e.target.value)}
                  className="w-full rounded-2xl border border-[#D0E4FE] bg-white px-3.5 py-2 text-xs font-bold text-[#091F5C] focus:border-[#334DAF] focus:outline-none"
                />
              </div>

              {dusunError && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {dusunError}
                </p>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDusun(null)}
                className="rounded-full bg-[#E8F2FE] px-4 py-2 text-xs font-bold text-[#091F5C]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingDusun}
                className="rounded-full bg-[#334DAF] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#091F5C] disabled:opacity-60"
              >
                {isSavingDusun ? 'Menyimpan...' : 'Simpan Data Dusun'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
