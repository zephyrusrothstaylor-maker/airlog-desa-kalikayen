import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Download,
  Droplets,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  Layers,
  ListFilter,
  MapPin,
  Navigation,
  PlusCircle,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import type { Dusun, InventorySummaryStats, WaterFacility } from '../types/inventory';
import { CategoryIcon, ConditionBadge, getCategoryLabel } from './ConditionBadge';

export type ActiveTab = 'dashboard' | 'map' | 'list' | 'dusun';

interface DashboardViewProps {
  stats: InventorySummaryStats;
  facilities: WaterFacility[];
  dusunList: Dusun[];
  isSupabaseReady: boolean;
  webGisPortalUrl: string;
  onNavigateTab: (tab: ActiveTab, filterCondition?: string) => void;
  onOpenAddModal: () => void;
  onOpenUpdateModal: (facility?: WaterFacility) => void;
  onSelectFacilityOnMap: (facility: WaterFacility) => void;
  onExportExcel: () => void;
  onExportGeoJson: () => void;
  onOpenWebGisModal: () => void;
  onInstallApp: () => void;
}

export function DashboardView({
  stats,
  facilities,
  dusunList,
  isSupabaseReady,
  webGisPortalUrl,
  onNavigateTab,
  onOpenAddModal,
  onOpenUpdateModal,
  onSelectFacilityOnMap,
  onExportExcel,
  onExportGeoJson,
  onOpenWebGisModal,
  onInstallApp,
}: DashboardViewProps) {
  const priorityFacilities = facilities.filter((f) => f.condition !== 'berfungsi_baik');

  const latestInspectionDate = facilities.reduce((latest, item) => {
    const time = new Date(item.last_inspected_at).getTime();
    return time > latest ? time : latest;
  }, 0);

  const formattedLastUpdate =
    latestInspectionDate > 0
      ? new Date(latestInspectionDate).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Hari ini';

  const quickMenuTiles = [
    {
      id: 'map',
      title: 'Peta Titik Air',
      subtitle: `${stats.totalFacilities} Lokasi GPS`,
      icon: MapPin,
      accentBg: 'bg-[#D0E4FE]',
      iconColor: 'text-[#091F5C]',
      onClick: () => onNavigateTab('map'),
    },
    {
      id: 'inventory',
      title: 'Inventaris Air',
      subtitle: 'Daftar & Filter',
      icon: ListFilter,
      accentBg: 'bg-[#E8F2FE]',
      iconColor: 'text-[#334DAF]',
      onClick: () => onNavigateTab('list'),
    },
    {
      id: 'condition',
      title: 'Input Kondisi',
      subtitle: 'Berfungsi / Rusak',
      icon: ClipboardCheck,
      accentBg: 'bg-emerald-100',
      iconColor: 'text-emerald-800',
      onClick: () => {
        if (priorityFacilities[0]) {
          onOpenUpdateModal(priorityFacilities[0]);
        } else {
          onOpenUpdateModal(facilities[0]);
        }
      },
    },
    {
      id: 'add',
      title: 'Tambah Titik',
      subtitle: 'Input + GPS HP',
      icon: PlusCircle,
      accentBg: 'bg-[#D0E4FE]',
      iconColor: 'text-[#334DAF]',
      onClick: onOpenAddModal,
    },
    {
      id: 'analytics',
      title: 'Rekap Dusun',
      subtitle: `${dusunList.length} Wilayah Dusun`,
      icon: BarChart3,
      accentBg: 'bg-[#E8F2FE]',
      iconColor: 'text-[#091F5C]',
      onClick: () => onNavigateTab('dusun'),
    },
    {
      id: 'webgis',
      title: 'WebGIS & APK',
      subtitle: 'GeoJSON & Mobile',
      icon: Layers,
      accentBg: 'bg-amber-100',
      iconColor: 'text-amber-800',
      onClick: onOpenWebGisModal,
    },
  ];

  return (
    <div className="min-h-screen bg-[#091F5C] pb-28">
      {/* Hero Header (Reference 1 Deep Navy/Royal Diagonal + Reference 2 Quick Pills) */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#091F5C] via-[#183182] to-[#334DAF] px-5 pb-11 pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:px-8">
        {/* Diagonal Geometric Shape Overlay matching Reference 1 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rotate-12 rounded-[40px] bg-[#334DAF]/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-12 top-20 h-36 w-36 -rotate-12 rounded-3xl bg-[#7096D1]/20"
        />

        <div className="relative mx-auto max-w-5xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C] shadow-sm">
                <Droplets className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-[#D0E4FE]">
                  Desa Kalikayen • Ungaran Timur
                </span>
                <span className="block truncate text-sm font-extrabold text-white">
                  AIRLOG Kalikayen
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-[#D0E4FE] sm:inline-flex">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isSupabaseReady ? 'bg-emerald-400' : 'bg-[#D0E4FE]'
                  }`}
                />
                {isSupabaseReady ? 'Cloud Aktif' : 'Penyimpanan Desa'}
              </span>
              <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                <span
                  className={`h-2 w-2 rounded-full sm:hidden ${
                    isSupabaseReady ? 'bg-emerald-400' : 'bg-[#D0E4FE]'
                  }`}
                />
                <Users className="h-3.5 w-3.5 text-[#D0E4FE]" />
                <span className="text-[11px] font-semibold text-white">Tim KKN & Desa</span>
              </div>
            </div>
          </div>

          {/* Dashboard Title & Subtitle */}
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-[22px] font-extrabold leading-snug text-white sm:text-3xl">
                Inventaris & Pelaporan Air Desa Kalikayen
              </h1>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#D0E4FE] sm:text-sm">
                Geotagging Partisipatif • Pembaruan: {formattedLastUpdate} • {dusunList.length} Wilayah Dusun
              </p>
            </div>

            {/* Clean 2-Tier Action Pills */}
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#D0E4FE] px-4 py-2.5 text-xs font-extrabold text-[#091F5C] shadow-sm transition hover:bg-white active:scale-[0.99]"
                >
                  <PlusCircle className="h-4 w-4 text-[#334DAF]" />
                  Tambah Titik Air
                </button>
                <button
                  type="button"
                  onClick={onOpenWebGisModal}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#D0E4FE]/40 bg-white/15 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-[0.99]"
                >
                  <Layers className="h-4 w-4 text-[#D0E4FE]" />
                  WebGIS & APK
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={onExportGeoJson}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-[0.99]"
                >
                  <FileJson className="h-3.5 w-3.5 text-[#D0E4FE]" />
                  GeoJSON
                </button>
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-[0.99]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#D0E4FE]" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-[0.99]"
                >
                  <Download className="h-3.5 w-3.5 text-[#D0E4FE]" />
                  Install
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Rounded Sheet Surface (#F9FBFF matching Reference 1 & 3) */}
      <section className="relative z-10 -mt-6 rounded-t-[32px] bg-[#F9FBFF] px-4 pt-6 pb-10 shadow-float sm:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Section 1: CareSync-inspired 2x2 Health/Status Overview Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#091F5C]">
                Ikhtisar Kondisi Fisik Sumber Air
              </h2>
              <span className="text-xs font-semibold text-[#334DAF]">
                Total {stats.totalBeneficiaryKK} KK Terlayani
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {/* Card 1: Berfungsi Baik (Primary Periwinkle #D0E4FE) */}
              <button
                type="button"
                onClick={() => onNavigateTab('list', 'berfungsi_baik')}
                className="group relative overflow-hidden rounded-2xl bg-[#D0E4FE] p-4 text-left transition hover:shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#091F5C]">
                  <span>Berfungsi Baik</span>
                  <ShieldCheck className="h-4 w-4 text-[#334DAF]" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-[#091F5C]">
                    {stats.berfungsiBaik}
                  </span>
                  <span className="text-xs font-semibold text-[#334DAF]">
                    / {stats.totalFacilities} titik
                  </span>
                </div>
                {/* Decorative pulse line matching Reference 2 */}
                <svg
                  className="mt-2 h-5 w-full stroke-[#334DAF]"
                  viewBox="0 0 120 24"
                  fill="none"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 14h24l8-9 10 16 10-12 8 5h56" />
                </svg>
              </button>

              {/* Card 2: Rusak Ringan (#E8F2FE) */}
              <button
                type="button"
                onClick={() => onNavigateTab('list', 'rusak_ringan')}
                className="rounded-2xl border border-[#D0E4FE] bg-[#E8F2FE] p-4 text-left transition hover:shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#091F5C]">
                  <span>Rusak Ringan</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-[#091F5C]">
                    {stats.rusakRingan}
                  </span>
                  <span className="text-xs font-medium text-[#334DAF]">perlu servis</span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-[#334DAF]">
                  Masih mengalir sebagian
                </p>
              </button>

              {/* Card 3: Rusak Berat (#E8F2FE) */}
              <button
                type="button"
                onClick={() => onNavigateTab('list', 'rusak_berat')}
                className="rounded-2xl border border-[#D0E4FE] bg-[#E8F2FE] p-4 text-left transition hover:shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#091F5C]">
                  <span>Rusak Berat</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-rose-700">{stats.rusakBerat}</span>
                  <span className="text-xs font-medium text-rose-600">darurat</span>
                </div>
                <p className="mt-2 text-[11px] font-medium text-[#334DAF]">
                  Aliran terputus / mati
                </p>
              </button>

              {/* Card 4: Kering & Cakupan KK (#D0E4FE) */}
              <button
                type="button"
                onClick={() => onNavigateTab('list', 'kering')}
                className="rounded-2xl bg-[#D0E4FE] p-4 text-left transition hover:shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#091F5C]">
                  <span>Kering Musiman</span>
                  <Users className="h-4 w-4 text-[#334DAF]" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-[#091F5C]">{stats.kering}</span>
                  <span className="text-xs font-semibold text-[#334DAF]">sumber</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-[#091F5C]">
                  {stats.totalBeneficiaryKK} KK Pemanfaat Air
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Reference 1 Style 2x3 Elevated Square Icon Grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#091F5C]">
                Menu Cepat Perangkat Desa
              </h2>
              <span className="text-xs text-[#7096D1]">Ketuk menu untuk membuka</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5">
              {quickMenuTiles.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={tile.onClick}
                    className="group flex flex-col items-center justify-center rounded-3xl border border-[#E8F2FE] bg-white p-5 text-center shadow-card transition hover:-translate-y-0.5 hover:border-[#7096D1] hover:shadow-float active:scale-[0.99]"
                  >
                    <div
                      className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${tile.accentBg} ${tile.iconColor} transition group-hover:scale-105`}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <span className="text-sm font-bold text-[#091F5C]">{tile.title}</span>
                    <span className="mt-0.5 text-xs font-medium text-[#7096D1]">
                      {tile.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Portal Informasi Air Desa (WebGIS & Mobile APK Hub) */}
          <div className="rounded-3xl border border-[#D0E4FE] bg-gradient-to-r from-[#E8F2FE] via-white to-[#D0E4FE]/60 p-5 shadow-card">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#091F5C] px-3 py-0.5 text-[11px] font-bold text-[#D0E4FE]">
                  <Layers className="h-3.5 w-3.5" />
                  Portal Informasi Air Desa Kalikayen
                </div>
                <h3 className="text-base font-extrabold text-[#091F5C]">
                  Integrasi WebGIS Desa Kalikayen & Aplikasi Mobile
                </h3>
                <p className="max-w-2xl text-xs text-[#334DAF]">
                  Setiap titik geotagging dan laporan kerusakan di <strong>AIRLOG</strong> langsung tersedia sebagai layer spasial <strong>GeoJSON (WGS84 / EPSG:4326)</strong> untuk peta WebGIS serta dapat di-deploy sebagai aplikasi Android (<code>.apk</code>).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {webGisPortalUrl && (
                  <a
                    href={webGisPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#334DAF] bg-white px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#E8F2FE]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-[#334DAF]" />
                    Buka Portal WebGIS
                  </a>
                )}
                <button
                  type="button"
                  onClick={onExportGeoJson}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#D0E4FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#7096D1] hover:text-white"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  Unduh .geojson
                </button>
                <button
                  type="button"
                  onClick={onOpenWebGisModal}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#091F5C] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#334DAF]"
                >
                  <Smartphone className="h-3.5 w-3.5 text-[#D0E4FE]" />
                  Panduan WebGIS & Build APK
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Prioritas Perbaikan (Reference 2 List Card Pattern) */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#091F5C]">
                  Titik Air Perlu Perhatian ({priorityFacilities.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('list')}
                className="text-xs font-bold text-[#334DAF] hover:underline"
              >
                Lihat Semua ({facilities.length}) →
              </button>
            </div>

            {facilities.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#7096D1] bg-white p-8 text-center shadow-card">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F2FE] text-[#334DAF]">
                  <Droplets className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-extrabold text-[#091F5C]">
                  Data Titik Air Desa Kalikayen Masih Kosong (0 Titik)
                </h3>
                <p className="mx-auto mt-1 max-w-md text-xs text-[#7096D1]">
                  Belum ada data fasilitas atau sumber air yang diinput. Ketuk tombol di bawah untuk mulai menambahkan titik air pertama di lapangan.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#334DAF] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
                >
                  <PlusCircle className="h-4 w-4" />
                  Tambah Titik Air Pertama
                </button>
              </div>
            ) : priorityFacilities.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center text-xs font-semibold text-emerald-800">
                Seluruh titik fasilitas air ({facilities.length} lokasi) saat ini dalam kondisi Berfungsi Baik.
              </div>
            ) : (
              <div className="space-y-3">
                {priorityFacilities.map((facility) => (
                  <div
                    key={facility.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-[#D0E4FE] bg-white p-4 shadow-card sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F2FE] text-[#334DAF]">
                        <CategoryIcon category={facility.category} className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[#E8F2FE] px-2 py-0.5 font-mono text-[11px] font-bold text-[#334DAF]">
                            {facility.code}
                          </span>
                          <ConditionBadge condition={facility.condition} />
                        </div>
                        <h3 className="mt-1 text-sm font-bold text-[#091F5C]">{facility.name}</h3>
                        <p className="text-xs text-[#7096D1]">
                          {facility.dusun_name} (RT {facility.rt ?? '-'} / RW {facility.rw ?? '-'}) •{' '}
                          {getCategoryLabel(facility.category)} • {facility.beneficiary_kk} KK
                        </p>
                        {facility.condition_notes && (
                          <p className="mt-1.5 rounded-xl bg-[#F9FBFF] px-3 py-1.5 text-xs text-[#091F5C]">
                            <strong className="font-semibold text-[#334DAF]">Catatan:</strong>{' '}
                            {facility.condition_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onSelectFacilityOnMap(facility)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#D0E4FE]"
                      >
                        <Navigation className="h-3.5 w-3.5 text-[#334DAF]" />
                        Peta
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenUpdateModal(facility)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Update Kondisi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
