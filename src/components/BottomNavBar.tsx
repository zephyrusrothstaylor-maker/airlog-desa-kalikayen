import { BarChart3, ClipboardCheck, Home, ListFilter, MapPin } from 'lucide-react';
import type { ActiveTab } from './DashboardView';

interface BottomNavBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenQuickConditionModal: () => void;
}

interface NavTabItem {
  id: ActiveTab;
  label: string;
  icon: typeof Home;
}

const LEFT_TABS: NavTabItem[] = [
  { id: 'dashboard', label: 'Beranda', icon: Home },
  { id: 'map', label: 'Peta Air', icon: MapPin },
];

const RIGHT_TABS: NavTabItem[] = [
  { id: 'list', label: 'Daftar', icon: ListFilter },
  { id: 'dusun', label: 'Rekap', icon: BarChart3 },
];

export function BottomNavBar({
  activeTab,
  onSelectTab,
  onOpenQuickConditionModal,
}: BottomNavBarProps) {
  const renderTabButton = (tab: NavTabItem) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onSelectTab(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition ${
          isActive
            ? 'bg-white/15 text-white shadow-xs'
            : 'text-[#9BB9EC] hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className={`h-5 w-5 ${isActive ? 'text-[#D0E4FE]' : ''}`} />
        <span className="truncate">{tab.label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-xl px-4 pb-[max(0.75rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]"
    >
      <div className="relative grid grid-cols-5 items-center rounded-[28px] bg-[#091F5C] px-2 py-2 text-white shadow-float">
        {LEFT_TABS.map(renderTabButton)}

        {/* Prominent Raised Center Action Button locked to exact horizontal center */}
        <div className="-mt-8 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onOpenQuickConditionModal}
            title="Input Kondisi Fisik"
            aria-label="Input Kondisi Fisik"
            className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#F9FBFF] bg-[#7096D1] text-white shadow-float transition hover:bg-[#334DAF] active:scale-95"
          >
            <ClipboardCheck className="h-6 w-6" />
          </button>
          <span className="mt-0.5 text-[10px] font-extrabold text-[#D0E4FE]">Cek Fisik</span>
        </div>

        {RIGHT_TABS.map(renderTabButton)}
      </div>
    </nav>
  );
}
