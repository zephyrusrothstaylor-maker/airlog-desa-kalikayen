import { BarChart3, ClipboardCheck, Home, ListFilter, MapPin } from 'lucide-react';
import type { ActiveTab } from './DashboardView';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenQuickConditionModal: () => void;
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  onOpenQuickConditionModal,
}: BottomNavBarProps) {
  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl px-4 pb-3"
    >
      <div className="relative flex items-center justify-between rounded-[28px] bg-[#091F5C] px-5 py-2.5 text-white shadow-float">
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-bold transition ${
            activeTab === 'dashboard' ? 'text-[#D0E4FE]' : 'text-[#7096D1] hover:text-white'
          }`}
        >
          <Home className="h-5 w-5" />
          <span>Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('map')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-bold transition ${
            activeTab === 'map' ? 'text-[#D0E4FE]' : 'text-[#7096D1] hover:text-white'
          }`}
        >
          <MapPin className="h-5 w-5" />
          <span>Peta Air</span>
        </button>

        <div className="-mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={onOpenQuickConditionModal}
            title="Input Kondisi Fisik"
            className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#F9FBFF] bg-[#7096D1] text-white shadow-float transition hover:bg-[#334DAF] active:scale-95"
          >
            <ClipboardCheck className="h-6 w-6" />
          </button>
          <span className="mt-0.5 text-[10px] font-extrabold text-[#D0E4FE]">Cek Fisik</span>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab('list')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-bold transition ${
            activeTab === 'list' ? 'text-[#D0E4FE]' : 'text-[#7096D1] hover:text-white'
          }`}
        >
          <ListFilter className="h-5 w-5" />
          <span>Daftar</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('dusun')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-bold transition ${
            activeTab === 'dusun' ? 'text-[#D0E4FE]' : 'text-[#7096D1] hover:text-white'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          <span>Rekap</span>
        </button>
      </div>
    </nav>
  );
}
