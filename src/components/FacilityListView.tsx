import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ClipboardCheck,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  SEASONAL_AVAILABILITY_LABELS,
  WATER_CLARITY_LABELS,
  type Dusun,
  type FacilityCategory,
  type PhotoPreviewData,
  type PhysicalCondition,
  type WaterFacility,
} from '../types/inventory';
import { buildGoogleMapsUrl, buildWhatsappChatUrl } from '../utils/whatsappShare';
import { CategoryIcon, ConditionBadge, getCategoryLabel } from './ConditionBadge';

type SortOption = 'code' | 'priority' | 'latest' | 'kk';

const CONDITION_PRIORITY: Record<PhysicalCondition, number> = {
  rusak_berat: 0,
  rusak_ringan: 1,
  kering: 2,
  berfungsi_baik: 3,
};

interface FacilityListViewProps {
  facilities: WaterFacility[];
  dusunList: Dusun[];
  initialConditionFilter?: string;
  initialDusunFilter?: string;
  isAdmin?: boolean;
  onOpenUpdateModal: (facility: WaterFacility) => void;
  onOpenEditModal: (facility: WaterFacility) => void;
  onOpenAddModal: () => void;
  onSelectFacilityOnMap: (facility: WaterFacility) => void;
  onDeleteFacility: (facilityId: string) => void;
  onExportExcel: () => void;
  onExportGeoJson: () => void;
  onShareFacility: (facility: WaterFacility) => void;
  onPreviewPhoto: (photo: PhotoPreviewData) => void;
}

export function FacilityListView({
  facilities,
  dusunList,
  initialConditionFilter = 'all',
  initialDusunFilter = 'all',
  isAdmin = false,
  onOpenUpdateModal,
  onOpenEditModal,
  onOpenAddModal,
  onSelectFacilityOnMap,
  onDeleteFacility,
  onExportExcel,
  onExportGeoJson,
  onShareFacility,
  onPreviewPhoto,
}: FacilityListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDusun, setSelectedDusun] = useState<string>(initialDusunFilter);
  const [selectedCondition, setSelectedCondition] = useState<string>(initialConditionFilter);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('code');
  const [pendingDeleteFacility, setPendingDeleteFacility] = useState<WaterFacility | null>(null);

  useEffect(() => {
    if (!pendingDeleteFacility) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingDeleteFacility(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDeleteFacility]);

  const filteredFacilities = useMemo(() => {
    const filtered = facilities.filter((item) => {
      if (selectedDusun !== 'all' && item.dusun_id !== selectedDusun) {
        return false;
      }
      if (selectedCondition !== 'all' && item.condition !== selectedCondition) {
        return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesAddress = (item.address_detail ?? '').toLowerCase().includes(q);
        const matchesDusun = (item.dusun_name ?? '').toLowerCase().includes(q);
        const matchesManager = (item.manager_name ?? '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesAddress || matchesDusun || matchesManager;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const diff = CONDITION_PRIORITY[a.condition] - CONDITION_PRIORITY[b.condition];
        return diff !== 0 ? diff : a.code.localeCompare(b.code);
      }
      if (sortBy === 'latest') {
        return (
          new Date(b.last_inspected_at).getTime() - new Date(a.last_inspected_at).getTime()
        );
      }
      if (sortBy === 'kk') {
        return (b.beneficiary_kk || 0) - (a.beneficiary_kk || 0);
      }
      return a.code.localeCompare(b.code);
    });
  }, [facilities, searchQuery, selectedDusun, selectedCondition, selectedCategory, sortBy]);

  const conditionFilters: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Semua Kondisi' },
    { value: 'berfungsi_baik', label: PHYSICAL_CONDITION_LABELS.berfungsi_baik },
    { value: 'rusak_ringan', label: PHYSICAL_CONDITION_LABELS.rusak_ringan },
    { value: 'rusak_berat', label: PHYSICAL_CONDITION_LABELS.rusak_berat },
    { value: 'kering', label: PHYSICAL_CONDITION_LABELS.kering },
  ];

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDusun('all');
    setSelectedCondition('all');
    setSelectedCategory('all');
  };

  return (
    <div className="min-h-screen bg-[#F9FBFF] pb-36">
      {/* Top Search & Filter Bar (mengalir alami agar tidak menutupi kartu pada layar kecil) */}
      <header className="pt-safe-header border-b border-[#D0E4FE] bg-white px-4 pb-4 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-[#091F5C] sm:text-xl">
                Daftar Titik Fasilitas & Sumber Air
              </h1>
              <p className="text-xs font-medium text-[#7096D1]">
                Menampilkan {filteredFacilities.length} dari {facilities.length} titik terdata
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportGeoJson}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F2FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#D0E4FE]"
              >
                <FileJson className="h-4 w-4 text-[#334DAF]" />
                Export GeoJSON
              </button>
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#D0E4FE] px-3.5 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#7096D1] hover:text-white"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#334DAF]" />
                Export Excel
              </button>
              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
              >
                <Plus className="h-4 w-4" />
                Titik Baru
              </button>
            </div>
          </div>

          {/* Search Pill Bar */}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7096D1]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama titik air, kode (AIR-KKY-...), pengelola, atau lokasi..."
                className="w-full rounded-full border border-[#D0E4FE] bg-white py-2.5 pl-10 pr-9 text-sm text-[#091F5C] placeholder-[#7096D1] shadow-sm focus:border-[#334DAF] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#E8F2FE] p-1 text-[#334DAF] hover:bg-[#D0E4FE]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[155px] flex-1 sm:w-44 sm:flex-initial">
                <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#334DAF]" />
                <select
                  aria-label="Filter Jenis Fasilitas"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none rounded-full border border-[#D0E4FE] bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-[#091F5C] shadow-sm focus:border-[#334DAF] focus:outline-none"
                >
                  <option value="all">Semua Jenis Sumber</option>
                  {(Object.keys(FACILITY_CATEGORY_LABELS) as FacilityCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {FACILITY_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[140px] flex-1 sm:w-40 sm:flex-initial">
                <ArrowUpDown className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#334DAF]" />
                <select
                  aria-label="Urutkan Daftar"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full appearance-none rounded-full border border-[#D0E4FE] bg-white py-2.5 pl-9 pr-4 text-xs font-semibold text-[#091F5C] shadow-sm focus:border-[#334DAF] focus:outline-none"
                >
                  <option value="code">Urut: Kode Titik</option>
                  <option value="priority">Urut: Prioritas Rusak</option>
                  <option value="latest">Urut: Update Terbaru</option>
                  <option value="kk">Urut: KK Terbanyak</option>
                </select>
              </div>

              {(searchQuery ||
                selectedDusun !== 'all' ||
                selectedCondition !== 'all' ||
                selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  title="Reset Filter"
                  className="inline-flex items-center gap-1 rounded-full bg-[#E8F2FE] px-3 py-2.5 text-xs font-bold text-[#334DAF] hover:bg-[#D0E4FE]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Dusun & Condition Pill Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedDusun('all')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                selectedDusun === 'all'
                  ? 'bg-[#091F5C] text-white'
                  : 'bg-[#E8F2FE] text-[#091F5C] hover:bg-[#D0E4FE]'
              }`}
            >
              Semua Dusun
            </button>
            {dusunList.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDusun(d.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  selectedDusun === d.id
                    ? 'bg-[#091F5C] text-white'
                    : 'bg-[#E8F2FE] text-[#091F5C] hover:bg-[#D0E4FE]'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {conditionFilters.map((cf) => (
              <button
                key={cf.value}
                type="button"
                onClick={() => setSelectedCondition(cf.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  selectedCondition === cf.value
                    ? 'bg-[#334DAF] text-white shadow-sm'
                    : 'border border-[#D0E4FE] bg-white text-[#334DAF] hover:bg-[#E8F2FE]'
                }`}
              >
                {cf.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stacked Horizontal Facility Cards (Reference 1 Middle + Reference 2 List) */}
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-8">
        {facilities.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#7096D1] bg-white p-8 text-center shadow-card">
            <p className="text-base font-extrabold text-[#091F5C]">
              Belum Ada Data Titik Air Terdaftar (0 Titik)
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-[#7096D1]">
              Data fasilitas dan sumber air Desa Kalikayen masih kosong. Ketuk tombol di bawah untuk mulai mencatat titik air pertama beserta koordinat GPS lapangan.
            </p>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
            >
              <Plus className="h-4 w-4" />
              Tambah Titik Air Pertama
            </button>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="rounded-3xl border border-[#D0E4FE] bg-white p-10 text-center shadow-card">
            <p className="text-base font-bold text-[#091F5C]">
              Tidak ada titik air yang cocok dengan filter pencarian.
            </p>
            <p className="mt-1 text-xs text-[#7096D1]">
              Coba ubah kata kunci pencarian atau reset filter Dusun dan Kondisi Fisik.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2 text-xs font-bold text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Tampilkan Semua Titik Air
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredFacilities.map((facility: WaterFacility) => {
              const googleMapsUrl = buildGoogleMapsUrl(facility.latitude, facility.longitude);
              const managerWaUrl = buildWhatsappChatUrl(
                facility.manager_phone,
                `Halo ${facility.manager_name ?? 'Pengelola'}, terkait sarana air [${facility.code}] ${facility.name} (${facility.dusun_name ?? 'Desa Kalikayen'}).`
              );
              return (
                <article
                  key={facility.id}
                  className="group rounded-3xl border border-[#E8F2FE] bg-white p-4 shadow-card transition hover:border-[#7096D1] sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    {/* Left Icon + Details */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#E8F2FE] p-3 text-[#334DAF]">
                        <CategoryIcon category={facility.category} className="h-6 w-6" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-[#D0E4FE] px-2.5 py-0.5 font-mono text-xs font-bold text-[#091F5C]">
                            {facility.code}
                          </span>
                          <ConditionBadge condition={facility.condition} size="md" />
                          <span className="rounded-full bg-[#E8F2FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#334DAF]">
                            {getCategoryLabel(facility.category)}
                          </span>
                        </div>

                        <h2 className="text-base font-extrabold text-[#091F5C]">{facility.name}</h2>

                        <p className="text-xs font-medium text-[#334DAF]">
                          {facility.dusun_name} • RT {facility.rt ?? '-'} / RW {facility.rw ?? '-'}{' '}
                          {facility.address_detail ? `• ${facility.address_detail}` : ''}
                        </p>

                        {/* Metadata Pills */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-[#7096D1]">
                          <span className="inline-flex items-center gap-1 font-semibold text-[#091F5C]">
                            <Users className="h-3.5 w-3.5 text-[#334DAF]" />
                            {facility.beneficiary_kk} KK Pemanfaat
                          </span>
                          <span>Air: {WATER_CLARITY_LABELS[facility.water_clarity]}</span>
                          <span>
                            Musim: {SEASONAL_AVAILABILITY_LABELS[facility.seasonal_availability]}
                          </span>
                          <span className="font-mono text-[11px]">
                            GPS: {facility.latitude.toFixed(5)}, {facility.longitude.toFixed(5)}
                            {facility.elevation_m ? ` (${facility.elevation_m} mdpl)` : ''}
                          </span>
                        </div>

                        {facility.condition_notes && (
                          <div className="mt-2 rounded-2xl border border-[#E8F2FE] bg-[#F9FBFF] px-3.5 py-2 text-xs text-[#091F5C]">
                            <span className="font-bold text-[#334DAF]">Catatan Kondisi: </span>
                            {facility.condition_notes}
                          </div>
                        )}

                        {facility.photo_url && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                onPreviewPhoto({
                                  src: facility.photo_url!,
                                  title: `[${facility.code}] ${facility.name}`,
                                  subtitle: `${facility.dusun_name ?? 'Desa Kalikayen'} • ${PHYSICAL_CONDITION_LABELS[facility.condition]}`,
                                })
                              }
                              className="group/photo relative overflow-hidden rounded-2xl border border-[#D0E4FE] transition hover:ring-2 hover:ring-[#334DAF]"
                            >
                              <img
                                src={facility.photo_url}
                                alt={facility.name}
                                className="h-28 w-44 object-cover"
                              />
                              <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-[#091F5C]/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                <ZoomIn className="h-3 w-3" />
                                Perbesar
                              </span>
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-[#7096D1]">
                          <span>
                            Diperiksa{' '}
                            <strong className="text-[#091F5C]">{facility.last_inspected_by}</strong> •{' '}
                            {new Date(facility.last_inspected_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {facility.funding_source ? ` • Sumber: ${facility.funding_source}` : ''}
                          </span>
                          {facility.manager_name && (
                            <span>
                              • Pengelola: <strong className="text-[#091F5C]">{facility.manager_name}</strong>
                            </span>
                          )}
                          {managerWaUrl && (
                            <a
                              href={managerWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              WA Pengelola
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Action Pill Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-col sm:items-end">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenUpdateModal(facility)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Input Kondisi
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(facility)}
                          title="Edit info & koordinat titik air"
                          className="inline-flex items-center gap-1 rounded-full border border-[#D0E4FE] bg-white px-3 py-2 text-xs font-bold text-[#091F5C] transition hover:bg-[#E8F2FE]"
                        >
                          <Pencil className="h-3.5 w-3.5 text-[#334DAF]" />
                          Edit
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectFacilityOnMap(facility)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#D0E4FE] px-3 py-1.5 text-xs font-bold text-[#091F5C] transition hover:bg-[#7096D1] hover:text-white"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Peta
                        </button>

                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-[#E8F2FE] px-3 py-1.5 text-xs font-bold text-[#334DAF] transition hover:bg-[#D0E4FE]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Rute
                        </a>

                        <button
                          type="button"
                          onClick={() => onShareFacility(facility)}
                          title="Bagikan laporan ke WhatsApp / perangkat"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          Bagikan
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteFacility(facility)}
                            title="Hapus titik air (khusus Admin Desa)"
                            className="inline-flex items-center justify-center rounded-full bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pendingDeleteFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091F5C]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[28px] bg-[#F9FBFF] p-5 shadow-float">
            <h2 className="text-base font-extrabold text-[#091F5C]">
              Hapus Titik Fasilitas Air?
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#334DAF]">
              Titik <strong>[{pendingDeleteFacility.code}] {pendingDeleteFacility.name}</strong> beserta riwayat pemeriksaannya akan dihapus permanen dari daftar Desa Kalikayen.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteFacility(null)}
                className="rounded-full bg-[#E8F2FE] px-4 py-2 text-xs font-bold text-[#091F5C] hover:bg-[#D0E4FE]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteFacility(pendingDeleteFacility.id);
                  setPendingDeleteFacility(null);
                }}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
