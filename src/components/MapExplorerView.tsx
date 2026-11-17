import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  ExternalLink,
  Layers,
  LocateFixed,
  Navigation,
  Plus,
  Users,
} from 'lucide-react';
import { captureCurrentGpsPosition } from '../utils/geolocation';
import {
  PHYSICAL_CONDITION_LABELS,
  type PhysicalCondition,
  type WaterFacility,
} from '../types/inventory';
import { ConditionBadge, getCategoryLabel, getConditionStyle } from './ConditionBadge';

interface MapExplorerViewProps {
  facilities: WaterFacility[];
  selectedFacility: WaterFacility | null;
  onSelectFacility: (facility: WaterFacility) => void;
  onOpenUpdateModal: (facility: WaterFacility) => void;
  onOpenAddModal: () => void;
}

function createPinIcon(condition: PhysicalCondition, isSelected: boolean): L.DivIcon {
  const style = getConditionStyle(condition);
  const size = isSelected ? 42 : 32;
  const ringColor = isSelected ? '#091F5C' : '#FFFFFF';
  const strokeWidth = isSelected ? 3.5 : 2.5;

  const html = `
    <div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;transform:translateY(-4px);">
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 3C11.3726 3 6 8.37258 6 15C6 23.25 18 33 18 33C18 33 30 23.25 30 15C30 8.37258 24.6274 3 18 3Z" fill="${style.pinHex}" stroke="${ringColor}" stroke-width="${strokeWidth}"/>
        <circle cx="18" cy="14.5" r="5" fill="#FFFFFF"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-water-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 3],
    popupAnchor: [0, -size + 6],
  });
}

export function MapExplorerView({
  facilities,
  selectedFacility,
  onSelectFacility,
  onOpenUpdateModal,
  onOpenAddModal,
}: MapExplorerViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapStyle, setMapStyle] = useState<'osm' | 'satellite'>('osm');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const visibleFacilities = useMemo(() => {
    if (conditionFilter === 'all') return facilities;
    return facilities.filter((f) => f.condition === conditionFilter);
  }, [facilities, conditionFilter]);

  const activeFacility = useMemo(() => {
    if (selectedFacility && visibleFacilities.some((f) => f.id === selectedFacility.id)) {
      return selectedFacility;
    }
    return visibleFacilities[0] ?? null;
  }, [selectedFacility, visibleFacilities]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = activeFacility
      ? [activeFacility.latitude, activeFacility.longitude]
      : [-7.0892, 110.4669];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const userLocGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersGroup;
    userLocationLayerRef.current = userLocGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      userLocationLayerRef.current = null;
    };
  }, []);

  // Switch Base Layer (OSM Street <-> Esri World Imagery Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    const nextTile =
      mapStyle === 'osm'
        ? L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          })
        : L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
              attribution: 'Tiles &copy; Esri',
              maxZoom: 19,
            }
          );

    nextTile.addTo(map);
    tileLayerRef.current = nextTile;
  }, [mapStyle]);

  // Render Markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current;
    if (!markersGroup) return;

    markersGroup.clearLayers();

    visibleFacilities.forEach((facility) => {
      const isSelected = activeFacility?.id === facility.id;
      const marker = L.marker([facility.latitude, facility.longitude], {
        icon: createPinIcon(facility.condition, isSelected),
      });

      marker.on('click', () => {
        onSelectFacility(facility);
      });

      marker.addTo(markersGroup);
    });
  }, [visibleFacilities, activeFacility, onSelectFacility]);

  // Pan to active facility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeFacility) return;
    map.flyTo([activeFacility.latitude, activeFacility.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.6,
    });
  }, [activeFacility]);

  const handleCycleFacility = (direction: -1 | 1) => {
    if (visibleFacilities.length === 0) return;
    const currentIndex = activeFacility
      ? visibleFacilities.findIndex((f) => f.id === activeFacility.id)
      : 0;
    const nextIndex =
      (currentIndex + direction + visibleFacilities.length) % visibleFacilities.length;
    onSelectFacility(visibleFacilities[nextIndex]);
  };

  const handleCenterOnUserLocation = async () => {
    setIsLocatingUser(true);
    setGpsError(null);
    try {
      const coords = await captureCurrentGpsPosition();
      const map = mapInstanceRef.current;
      const locGroup = userLocationLayerRef.current;
      if (map && locGroup) {
        locGroup.clearLayers();
        L.circle([coords.latitude, coords.longitude], {
          radius: Math.max(15, coords.accuracy_m),
          color: '#334DAF',
          fillColor: '#7096D1',
          fillOpacity: 0.25,
          weight: 1.5,
        }).addTo(locGroup);
        L.circleMarker([coords.latitude, coords.longitude], {
          radius: 7,
          color: '#FFFFFF',
          fillColor: '#091F5C',
          fillOpacity: 1,
          weight: 2.5,
        }).addTo(locGroup);
        map.flyTo([coords.latitude, coords.longitude], 17, { duration: 0.7 });
      }
    } catch (err) {
      setGpsError(err instanceof Error ? err.message : 'Gagal membaca lokasi GPS.');
      window.setTimeout(() => setGpsError(null), 4000);
    } finally {
      setIsLocatingUser(false);
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh)] flex-col overflow-hidden bg-[#E8F2FE]">
      {/* Reference 1 Right Screen: Floating Top Pill Header */}
      <div className="pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-20 mx-auto max-w-3xl px-4">
        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl bg-[#334DAF] px-4 py-3 text-white shadow-float">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D0E4FE] text-[#091F5C]">
              <Compass className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-xs font-extrabold tracking-wide">
                Peta Titik Air Kalikayen ({visibleFacilities.length})
              </span>
              <span className="block truncate text-[11px] text-[#D0E4FE]">
                Kec. Ungaran Timur • Ketuk pin untuk detail
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleCenterOnUserLocation()}
              disabled={isLocatingUser}
              title="Lokasi GPS Saya"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-60"
            >
              <LocateFixed className={`h-4 w-4 ${isLocatingUser ? 'animate-pulse text-[#D0E4FE]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setMapStyle((prev) => (prev === 'osm' ? 'satellite' : 'osm'))}
              className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <Layers className="h-3.5 w-3.5" />
              {mapStyle === 'osm' ? 'Satelit' : 'Jalan'}
            </button>
            <button
              type="button"
              onClick={onOpenAddModal}
              title="Tambah Titik Air"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D0E4FE] text-[#091F5C] transition hover:bg-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="pointer-events-auto mt-2 rounded-xl bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
            {gpsError}
          </div>
        )}

        {/* Floating Legend / Filter Pills */}
        <div className="pointer-events-auto mt-2 flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Semua', dot: 'bg-[#334DAF]' },
            { id: 'berfungsi_baik', label: 'Baik', dot: 'bg-emerald-500' },
            { id: 'rusak_ringan', label: 'Rusak Ringan', dot: 'bg-amber-500' },
            { id: 'rusak_berat', label: 'Rusak Berat', dot: 'bg-rose-500' },
            { id: 'kering', label: 'Kering', dot: 'bg-slate-500' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setConditionFilter(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm transition ${
                conditionFilter === item.id
                  ? 'bg-[#091F5C] text-white'
                  : 'bg-white/95 text-[#091F5C] hover:bg-[#D0E4FE]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="h-full w-full flex-1" />

      {/* Reference 1 Right Screen: Layered Rounded Bottom Sheet */}
      {!activeFacility ? (
        <div className="relative z-20 mx-auto w-full max-w-xl px-4 pb-28">
          <div className="rounded-[26px] border border-[#D0E4FE] bg-[#F9FBFF] p-5 text-center shadow-float">
            <h2 className="text-sm font-extrabold text-[#091F5C]">
              Belum Ada Titik Air di Peta Desa Kalikayen (0 Lokasi)
            </h2>
            <p className="mt-1 text-xs text-[#7096D1]">
              Tambahkan titik fasilitas atau sumber air baru beserta koordinat GPS lapangan.
            </p>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#091F5C]"
            >
              <Plus className="h-4 w-4" />
              Tambah Titik Air Pertama
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-20 mx-auto w-full max-w-3xl px-2 pb-28 sm:px-4">
          {/* Upper Accent Layer (Matches Reference 1's colored top tab of bottom sheet) */}
          <div className="rounded-t-[28px] bg-[#334DAF] px-5 pt-3 pb-6 text-white shadow-float">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#091F5C] px-2.5 py-0.5 font-mono text-xs font-bold text-[#D0E4FE]">
                  {activeFacility.code}
                </span>
                <span className="text-xs font-bold text-[#D0E4FE]">
                  {getCategoryLabel(activeFacility.category)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCycleFacility(-1)}
                  title="Titik Sebelumnya"
                  className="rounded-lg bg-white/15 p-1 text-white hover:bg-white/25"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCycleFacility(1)}
                  title="Titik Berikutnya"
                  className="rounded-lg bg-white/15 p-1 text-white hover:bg-white/25"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Inner White Card (Matches Reference 1's Workplace card with 3 square tiles) */}
          <div className="-mt-4 rounded-[26px] border border-[#D0E4FE] bg-[#F9FBFF] p-4 shadow-float sm:p-5">
            <div className="flex items-start justify-between gap-2.5">
              {activeFacility.photo_url && (
                <img
                  src={activeFacility.photo_url}
                  alt={activeFacility.name}
                  className="h-14 w-16 shrink-0 rounded-xl border border-[#D0E4FE] object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-extrabold text-[#091F5C] sm:text-lg">
                  {activeFacility.name}
                </h2>
                <p className="text-xs font-medium text-[#7096D1]">
                  {activeFacility.dusun_name} (RT {activeFacility.rt ?? '-'} / RW{' '}
                  {activeFacility.rw ?? '-'}) •{' '}
                  <span className="font-semibold text-[#091F5C]">
                    <Users className="mr-1 inline h-3.5 w-3.5 text-[#334DAF]" />
                    {activeFacility.beneficiary_kk} KK
                  </span>
                </p>
              </div>
              <ConditionBadge condition={activeFacility.condition} size="md" />
            </div>

            {activeFacility.condition_notes && (
              <p className="mt-2.5 rounded-xl bg-[#E8F2FE] px-3 py-2 text-xs text-[#091F5C]">
                <strong className="font-bold text-[#334DAF]">Kondisi Lapangan: </strong>
                {activeFacility.condition_notes}
              </p>
            )}

            {/* 3 Square Action Tiles matching Reference 1 Right Bottom Sheet */}
            <div className="mt-3.5 grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onOpenUpdateModal(activeFacility)}
                className="flex flex-col items-center justify-center rounded-2xl border border-[#D0E4FE] bg-white p-3 text-center shadow-sm transition hover:border-[#334DAF] hover:bg-[#E8F2FE]"
              >
                <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#D0E4FE] text-[#091F5C]">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-[#091F5C]">Input Kondisi</span>
                <span className="text-[10px] text-[#7096D1]">
                  {PHYSICAL_CONDITION_LABELS[activeFacility.condition]}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCycleFacility(1)}
                className="flex flex-col items-center justify-center rounded-2xl border border-[#D0E4FE] bg-white p-3 text-center shadow-sm transition hover:border-[#334DAF] hover:bg-[#E8F2FE]"
              >
                <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F2FE] text-[#334DAF]">
                  <Navigation className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-[#091F5C]">Titik Berikutnya</span>
                <span className="font-mono text-[10px] text-[#7096D1]">
                  {activeFacility.latitude.toFixed(4)}, {activeFacility.longitude.toFixed(4)}
                </span>
              </button>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${activeFacility.latitude},${activeFacility.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center rounded-2xl border border-[#D0E4FE] bg-white p-3 text-center shadow-sm transition hover:border-[#334DAF] hover:bg-[#E8F2FE]"
              >
                <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-[#091F5C]">Rute Maps</span>
                <span className="text-[10px] text-[#7096D1]">Navigasi HP</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
