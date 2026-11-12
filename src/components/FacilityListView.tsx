import { useMemo, useState } from 'react';
import {
  ClipboardCheck,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  SEASONAL_AVAILABILITY_LABELS,
  WATER_CLARITY_LABELS,
  type Dusun,
  type FacilityCategory,
  type WaterFacility,
} from '../types/inventory';
import { CategoryIcon, ConditionBadge, getCategoryLabel } from './ConditionBadge';

interface FacilityListViewProps {
  facilities: WaterFacility[];
  dusunList: Dusun[];
  initialConditionFilter?: string;
  onOpenUpdateModal: (facility: WaterFacility) => void;
  onOpenAddModal: () => void;
  onSelectFacilityOnMap: (facility: WaterFacility) => void;
  onDeleteFacility: (facilityId: string) => void;
  onExportExcel: () => void;
  onExportGeoJson: () => void;
}

export function FacilityListView({
  facilities,
  dusunList,
  initialConditionFilter = 'all',
  onOpenUpdateModal,
  onOpenAddModal,
  onSelectFacilityOnMap,
  onDeleteFacility,
  onExportExcel,
  onExportGeoJson,
}: FacilityListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDusun, setSelectedDusun] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>(initialConditionFilter);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredFacilities = useMemo(() => {
    return facilities.filter((item) => {
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
        return matchesName || matchesCode || matchesAddress || matchesDusun;
      }
      return true;
    });
  }, [facilities, searchQuery, selectedDusun, selectedCondition, selectedCategory]);

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
    <div className="min-h-screen bg-[#F9FBFF] pb-28">
      {/* Top Search & Filter Bar (Reference 1 Middle Screen + Reference 2 Header) */}
      <header className="sticky top-0 z-20 border-b border-[#D0E4FE] bg-[#F9FBFF]/95 px-4 py-4 backdrop-blur-md sm:px-8">
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
                placeholder="Cari nama titik air, kode (AIR-...), atau patokan lokasi..."
                className="w-full rounded-full border border-[#D0E4FE] bg-white py-2.5 pl-10 pr-4 text-sm text-[#091F5C] placeholder-[#7096D1] shadow-sm focus:border-[#334DAF] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#334DAF]" />
                <select
                  aria-label="Filter Jenis Fasilitas"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none rounded-full border border-[#D0E4FE] bg-white py-2.5 pl-9 pr-8 text-xs font-semibold text-[#091F5C] shadow-sm focus:border-[#334DAF] focus:outline-none"
                >
                  <option value="all">Semua Jenis Sumber</option>
                  {(Object.keys(FACILITY_CATEGORY_LABELS) as FacilityCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {FACILITY_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
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
        {filteredFacilities.length === 0 ? (
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
              const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${facility.latitude},${facility.longitude}`;
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

                      <div className="space-y-1">
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
                          <div className="mt-2 rounded-2xl bg-[#F9FBFF] px-3.5 py-2 text-xs text-[#091F5C] border border-[#E8F2FE]">
                            <span className="font-bold text-[#334DAF]">Catatan Kondisi: </span>
                            {facility.condition_notes}
                          </div>
                        )}

                        {facility.photo_url && (
                          <div className="mt-2">
                            <img
                              src={facility.photo_url}
                              alt={facility.name}
                              className="h-28 w-44 rounded-2xl border border-[#D0E4FE] object-cover"
                            />
                          </div>
                        )}

                        <p className="pt-1 text-[11px] text-[#7096D1]">
                          Diperiksa oleh{' '}
                          <strong className="text-[#091F5C]">{facility.last_inspected_by}</strong> •{' '}
                          {new Date(facility.last_inspected_at).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {facility.funding_source ? ` • Sumber: ${facility.funding_source}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Right Action Pill Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        onClick={() => onOpenUpdateModal(facility)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#091F5C]"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Input Kondisi
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectFacilityOnMap(facility)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#D0E4FE] px-3 py-1.5 text-xs font-bold text-[#091F5C] transition hover:bg-[#7096D1] hover:text-white"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Peta Desa
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
                          onClick={() => onDeleteFacility(facility.id)}
                          title="Hapus titik air"
                          className="inline-flex items-center justify-center rounded-full bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
