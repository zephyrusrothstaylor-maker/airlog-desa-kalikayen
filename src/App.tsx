import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, Smartphone, X } from 'lucide-react';
import { AddFacilityModal } from './components/AddFacilityModal';
import { BottomNavBar } from './components/BottomNavBar';
import { ConditionModal } from './components/ConditionModal';
import { DashboardView, type ActiveTab } from './components/DashboardView';
import { DusunAnalyticsView } from './components/DusunAnalyticsView';
import { FacilityListView } from './components/FacilityListView';
import { MapExplorerView } from './components/MapExplorerView';
import { WebGisIntegrationModal } from './components/WebGisIntegrationModal';
import { isSupabaseConfigured } from './lib/supabase';
import {
  computeSummaryStats,
  createFacility,
  deleteFacility,
  getConditionLogs,
  getDusunList,
  getFacilities,
  updateFacilityCondition,
} from './services/inventoryService';
import type {
  CreateWaterFacilityInput,
  Dusun,
  FacilityConditionLog,
  UpdateConditionInput,
  WaterFacility,
} from './types/inventory';
import { exportInventoryToExcel } from './utils/excelExport';
import { exportFacilitiesToGeoJson } from './utils/geojsonExport';

const WEBGIS_PORTAL_STORAGE_KEY = 'airlog_kalikayen_webgis_portal_url';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [listConditionFilter, setListConditionFilter] = useState<string>('all');

  const [dusunList, setDusunList] = useState<Dusun[]>([]);
  const [facilities, setFacilities] = useState<WaterFacility[]>([]);
  const [conditionLogs, setConditionLogs] = useState<FacilityConditionLog[]>([]);
  const [selectedMapFacility, setSelectedMapFacility] = useState<WaterFacility | null>(null);

  const [conditionModalFacility, setConditionModalFacility] = useState<WaterFacility | null>(null);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isWebGisModalOpen, setIsWebGisModalOpen] = useState(false);
  const [webGisPortalUrl, setWebGisPortalUrl] = useState<string>(() => {
    try {
      return window.localStorage.getItem(WEBGIS_PORTAL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const deepLinkHandledRef = useRef(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const loadAllData = useCallback(async () => {
    const [dusunData, facilityData, logsData] = await Promise.all([
      getDusunList(),
      getFacilities(),
      getConditionLogs(),
    ]);
    setDusunList(dusunData);
    setFacilities(facilityData);
    setConditionLogs(logsData);
    setSelectedMapFacility((prev) => {
      if (prev) {
        return facilityData.find((f) => f.id === prev.id) ?? facilityData[0] ?? null;
      }
      return facilityData[0] ?? null;
    });
    if (!deepLinkHandledRef.current) {
      deepLinkHandledRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const codeParam = params.get('code');
      if (action === 'lapor') {
        const matched = codeParam
          ? facilityData.find((f) => f.code.toLowerCase() === codeParam.toLowerCase())
          : facilityData[0];
        if (matched) {
          setConditionModalFacility(matched);
          setIsConditionModalOpen(true);
        } else if (facilityData.length === 0) {
          setIsAddModalOpen(true);
        } else {
          setConditionModalFacility(facilityData[0] ?? null);
          setIsConditionModalOpen(true);
        }
      }
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const stats = computeSummaryStats(facilities);

  const handleNavigateTab = (tab: ActiveTab, filterCondition?: string) => {
    if (filterCondition) {
      setListConditionFilter(filterCondition);
    } else if (tab === 'list') {
      setListConditionFilter('all');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenUpdateModal = (facility?: WaterFacility) => {
    const target = facility ?? selectedMapFacility ?? facilities[0] ?? null;
    setConditionModalFacility(target);
    setIsConditionModalOpen(true);
  };

  const handleSelectFacilityOnMap = (facility: WaterFacility) => {
    setSelectedMapFacility(facility);
    setActiveTab('map');
  };

  const handleSaveCondition = async (input: UpdateConditionInput) => {
    const updated = await updateFacilityCondition(input);
    await loadAllData();
    setSelectedMapFacility(updated);
    showToast(`Kondisi fisik "${updated.name}" berhasil diperbarui.`);
  };

  const handleCreateFacility = async (input: CreateWaterFacilityInput) => {
    const created = await createFacility(input);
    await loadAllData();
    setSelectedMapFacility(created);
    showToast(`Titik air baru "${created.name}" (${created.code}) berhasil ditambahkan.`);
  };

  const handleDeleteFacility = async (facilityId: string) => {
    await deleteFacility(facilityId);
    await loadAllData();
    showToast('Titik fasilitas air telah dihapus.');
  };

  const handleExportExcel = async () => {
    await exportInventoryToExcel(facilities, dusunList, 'Desa_Kalikayen_Ungaran_Timur');
    showToast('Laporan Excel (.xlsx) Desa Kalikayen berhasil diunduh.');
  };

  const handleExportGeoJson = () => {
    exportFacilitiesToGeoJson(facilities, dusunList);
    showToast('Layer GeoJSON (.geojson) WGS84 untuk WebGIS Desa berhasil diunduh.');
  };

  const handleSaveWebGisPortalUrl = (url: string) => {
    const trimmed = url.trim();
    setWebGisPortalUrl(trimmed);
    try {
      window.localStorage.setItem(WEBGIS_PORTAL_STORAGE_KEY, trimmed);
    } catch {
      // ignore storage errors
    }
    showToast(
      trimmed
        ? 'URL Portal WebGIS Desa berhasil disimpan.'
        : 'Tautan Portal WebGIS Desa telah direset.'
    );
  };

  const handleSyncData = async () => {
    await loadAllData();
    showToast('Data terbaru dari Supabase Cloud berhasil disinkronkan.');
  };

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      await deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
        showToast('Aplikasi SI-AIR Kalikayen berhasil di-install!');
      }
      return;
    }
    setIsInstallGuideOpen(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText('https://si-air-kalikayen.vercel.app');
      showToast('Link aplikasi berhasil disalin! Buka di Google Chrome untuk meng-install.');
    } catch {
      showToast('Gunakan link: https://si-air-kalikayen.vercel.app');
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F2FE] text-[#091F5C]">
      {toastMessage && (
        <div
          role="status"
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#091F5C] px-4 py-2.5 text-xs font-bold text-white shadow-float"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DashboardView
          stats={stats}
          facilities={facilities}
          dusunList={dusunList}
          isSupabaseReady={isSupabaseConfigured}
          webGisPortalUrl={webGisPortalUrl}
          onNavigateTab={handleNavigateTab}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenUpdateModal={(facility) => handleOpenUpdateModal(facility)}
          onSelectFacilityOnMap={handleSelectFacilityOnMap}
          onExportExcel={() => void handleExportExcel()}
          onExportGeoJson={handleExportGeoJson}
          onOpenWebGisModal={() => setIsWebGisModalOpen(true)}
          onInstallApp={() => void handleInstallApp()}
        />
      )}

      {activeTab === 'map' && (
        <MapExplorerView
          facilities={facilities}
          selectedFacility={selectedMapFacility}
          onSelectFacility={(facility) => setSelectedMapFacility(facility)}
          onOpenUpdateModal={(facility) => handleOpenUpdateModal(facility)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      )}

      {activeTab === 'list' && (
        <FacilityListView
          key={listConditionFilter}
          facilities={facilities}
          dusunList={dusunList}
          initialConditionFilter={listConditionFilter}
          onOpenUpdateModal={(facility) => handleOpenUpdateModal(facility)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onSelectFacilityOnMap={handleSelectFacilityOnMap}
          onDeleteFacility={(id) => void handleDeleteFacility(id)}
          onExportExcel={() => void handleExportExcel()}
          onExportGeoJson={handleExportGeoJson}
        />
      )}

      {activeTab === 'dusun' && (
        <DusunAnalyticsView
          dusunList={dusunList}
          facilities={facilities}
          conditionLogs={conditionLogs}
          onExportExcel={() => void handleExportExcel()}
          onExportGeoJson={handleExportGeoJson}
          onResetDemoData={() => void handleSyncData()}
        />
      )}

      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => handleNavigateTab(tab)}
        onOpenQuickConditionModal={() => handleOpenUpdateModal()}
      />

      {isConditionModalOpen && (
        <ConditionModal
          facility={conditionModalFacility}
          facilities={facilities}
          onSelectFacility={(f) => setConditionModalFacility(f)}
          onClose={() => setIsConditionModalOpen(false)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onSaveCondition={handleSaveCondition}
        />
      )}

      {isAddModalOpen && (
        <AddFacilityModal
          dusunList={dusunList}
          existingCount={facilities.length}
          onClose={() => setIsAddModalOpen(false)}
          onCreateFacility={handleCreateFacility}
        />
      )}

      {isWebGisModalOpen && (
        <WebGisIntegrationModal
          facilityCount={facilities.length}
          webgisUrl={webGisPortalUrl}
          onSaveWebgisUrl={handleSaveWebGisPortalUrl}
          onExportGeoJson={handleExportGeoJson}
          onTriggerPwaInstall={() => void handleInstallApp()}
          onClose={() => setIsWebGisModalOpen(false)}
        />
      )}

      {isInstallGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#091F5C]/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-[32px] bg-[#F9FBFF] p-6 shadow-float sm:rounded-[32px]">
            <div className="flex items-center justify-between border-b border-[#D0E4FE] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D0E4FE] text-[#091F5C]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#091F5C]">
                    Cara Install Aplikasi SI-AIR
                  </h2>
                  <p className="text-xs text-[#7096D1]">
                    Pasang di Layar Utama HP Android, iPhone, atau Laptop
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallGuideOpen(false)}
                className="rounded-full bg-[#E8F2FE] p-2 text-[#091F5C] hover:bg-[#D0E4FE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-[#091F5C]">
              <div className="rounded-2xl border border-[#D0E4FE] bg-white p-3.5 shadow-xs">
                <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  Opsi A • File Instalasi Android Native (.APK)
                </span>
                <p className="mt-1 font-bold text-[#091F5C]">
                  Unduh File AIRLOG-Desa-Kalikayen.apk (Untuk HP Android)
                </p>
                <p className="mt-0.5 text-[#334DAF]">
                  Unduh langsung file <code>.apk</code> di bawah ini, lalu buka di HP Android untuk meng-install aplikasi <strong>AIRLOG Kalikayen</strong>:
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <a
                    href="https://uwntlfrttdwyucmtsdpq.supabase.co/storage/v1/object/public/apk-releases/AIRLOG-Desa-Kalikayen.apk"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#091F5C] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#334DAF]"
                  >
                    <Download className="h-3.5 w-3.5 text-[#D0E4FE]" />
                    Unduh AIRLOG-Desa-Kalikayen.apk (4.3 MB)
                  </a>
                  <a
                    href="https://github.com/zephyrusrothstaylor-maker/airlog-desa-kalikayen"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-[#E8F2FE] px-3 py-2 text-[11px] font-bold text-[#091F5C] hover:bg-[#D0E4FE]"
                  >
                    Repositori GitHub
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-[#D0E4FE] bg-[#E8F2FE] p-3.5">
                <p className="font-bold text-[#334DAF]">
                  Opsi B • Install Langsung dari Browser (PWA Tanpa File APK)
                </p>
                <p className="mt-1 leading-relaxed">
                  Buka link resmi di bawah ini menggunakan <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, atau <strong>Safari</strong> (bukan di dalam Preview Browser IDE):
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                  <span className="truncate font-mono text-[11px] font-bold text-[#091F5C]">
                    https://si-air-kalikayen.vercel.app
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyUrl()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#334DAF] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#091F5C]"
                  >
                    <Copy className="h-3 w-3" />
                    Salin Link
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-[#D0E4FE] bg-white p-3.5">
                <p className="font-bold text-[#091F5C]">1. Di HP Android (Google Chrome):</p>
                <p className="text-[#334DAF]">
                  Buka link di Chrome → Ketuk tombol <strong>Install Aplikasi</strong> di halaman utama, atau ketuk ikon titik tiga (⋮) di kanan atas → Pilih <strong>&quot;Tambahkan ke layar utama&quot; / &quot;Instal aplikasi&quot;</strong>.
                </p>
                <p className="pt-1 font-bold text-[#091F5C]">2. Di Laptop / PC (Chrome / Edge):</p>
                <p className="text-[#334DAF]">
                  Buka link di Chrome/Edge → Klik ikon <strong>Install (layar dengan panah bawah)</strong> di sebelah kanan kolom URL (Address Bar).
                </p>
                <p className="pt-1 font-bold text-[#091F5C]">3. Di iPhone / iPad (Safari):</p>
                <p className="text-[#334DAF]">
                  Buka link di Safari → Ketuk tombol <strong>Share (Bagikan)</strong> di bagian bawah → Pilih <strong>&quot;Add to Home Screen&quot; (Tambahkan ke Layar Utama)</strong>.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInstallGuideOpen(false)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#334DAF] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#091F5C]"
              >
                <Download className="h-3.5 w-3.5" />
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
