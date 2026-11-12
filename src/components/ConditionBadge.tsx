import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Container,
  Droplets,
  GitBranch,
  Home,
  Pipette,
  SunMedium,
  Waves,
  XCircle,
} from 'lucide-react';
import {
  FACILITY_CATEGORY_LABELS,
  PHYSICAL_CONDITION_LABELS,
  type FacilityCategory,
  type PhysicalCondition,
} from '../types/inventory';

export function getConditionStyle(condition: PhysicalCondition): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  pinHex: string;
} {
  switch (condition) {
    case 'berfungsi_baik':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        pinHex: '#10B981',
      };
    case 'rusak_ringan':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        pinHex: '#F59E0B',
      };
    case 'rusak_berat':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        pinHex: '#EF4444',
      };
    case 'kering':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
        dot: 'bg-slate-500',
        pinHex: '#64748B',
      };
  }
}

export function ConditionBadge({
  condition,
  size = 'sm',
}: {
  condition: PhysicalCondition;
  size?: 'sm' | 'md';
}) {
  const style = getConditionStyle(condition);
  const Icon =
    condition === 'berfungsi_baik'
      ? CheckCircle2
      : condition === 'rusak_ringan'
        ? AlertTriangle
        : condition === 'rusak_berat'
          ? XCircle
          : SunMedium;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${style.bg} ${style.text} ${style.border} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {PHYSICAL_CONDITION_LABELS[condition]}
    </span>
  );
}

export function CategoryIcon({
  category,
  className = 'h-5 w-5',
}: {
  category: FacilityCategory;
  className?: string;
}) {
  switch (category) {
    case 'mata_air':
      return <Waves className={className} />;
    case 'sumur_bor':
      return <Pipette className={className} />;
    case 'sumur_gali':
      return <Droplets className={className} />;
    case 'pamsimas_reservoir':
      return <Container className={className} />;
    case 'kran_umum':
      return <Droplets className={className} />;
    case 'mck_umum':
      return <Home className={className} />;
    case 'jaringan_pipa':
      return <GitBranch className={className} />;
    case 'pah':
      return <CloudRain className={className} />;
  }
}

export function getCategoryLabel(category: FacilityCategory): string {
  return FACILITY_CATEGORY_LABELS[category];
}
