import {
  Building2,
  FileJson,
  FileSpreadsheet,
  History,
  Phone,
  RefreshCw,
  Users,
} from 'lucide-react';
import type { Dusun, FacilityConditionLog, WaterFacility } from '../types/inventory';
import { ConditionBadge } from './ConditionBadge';

interface DusunAnalyticsViewProps {
  dusunList: Dusun[];
  facilities: WaterFacility[];
  conditionLogs: FacilityConditionLog[];
  onExportExcel: () => void;
  onExportGeoJson: () => void;
  onResetDemoData: () => void;
}

export function DusunAnalyticsView({
  dusunList,
  facilities,
  conditionLogs,
  onExportExcel,
  onExportGeoJson,
  onResetDemoData,
}: DusunAnalyticsViewProps) {
  const facilityMap = new Map(facilities.map((f) => [f.id, f]));

  return (
    <div className="min-h-screen bg-[#F9FBFF] pb-28">
      <header className="border-b border-[#D0E4FE] bg-white px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-[#091F5C] sm:text-xl">
              Rekapitulasi Wilayah Dusun & Laporan
            </h1>
            <p className="text-xs font-medium text-[#7096D1]">
              Cakupan layanan air bersih per dusun & riwayat pemeriksaan lapangan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D0E4FE] bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#D0E4FE]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#334DAF]" />
              Sinkronkan Data Cloud
            </button>
            <button
              type="button"
              onClick={onExportGeoJson}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D0E4FE] px-4 py-2 text-xs font-bold text-[#091F5C] shadow-sm transition hover:bg-[#7096D1] hover:text-white"
            >
              <FileJson className="h-4 w-4" />
              Export GeoJSON (.geojson)
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Unduh Laporan Excel (.xlsx)
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 pt-6 sm:px-8">
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

                    {dusun.head_phone && (
                      <a
                        href={`https://wa.me/62${dusun.head_phone.replace(/^0/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#E8F2FE] px-3 py-1.5 text-xs font-bold text-[#334DAF] hover:bg-[#D0E4FE]"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Hubungi Kasun
                      </a>
                    )}
                  </div>

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
                    className="flex flex-col justify-between gap-2 rounded-2xl border border-[#E8F2FE] bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#334DAF]">
                          {fac?.code ?? 'TITIK-AIR'}
                        </span>
                        <span className="text-sm font-bold text-[#091F5C]">
                          {fac?.name ?? 'Fasilitas Air Desa'}
                        </span>
                        <ConditionBadge condition={log.new_condition} />
                      </div>
                      {log.notes && <p className="mt-1 text-xs text-[#091F5C]">{log.notes}</p>}
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
    </div>
  );
}
