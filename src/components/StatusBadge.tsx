import type { SnapshotStatusEnum } from '../api/types';

type Config = {
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  bar: string;
};

export const STATUS_CONFIG: Record<SnapshotStatusEnum, Config> = {
  NO_DATA:    { label: 'Sem dados',      icon: '◌', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', bar: 'bg-slate-400' },
  NO_QUEUE:   { label: 'Sem fila',       icon: '◉', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', bar: 'bg-green-600' },
  SMALL:      { label: 'Fila pequena',   icon: '◉', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', bar: 'bg-cyan-600' },
  MEDIUM:     { label: 'Fila média',     icon: '◉', color: '#d97706', bg: '#fffbeb', border: '#fde68a', bar: 'bg-amber-500' },
  LARGE:      { label: 'Fila grande',    icon: '◉', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', bar: 'bg-red-600' },
  FOOD_ENDED: { label: 'Acabou comida',  icon: '⬛', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', bar: 'bg-violet-600' },
};

type Props = {
  status: SnapshotStatusEnum;
  size?: 'sm' | 'md' | 'lg';
};

export function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = STATUS_CONFIG[status];

  return (
    <span
      className={`siis-status-badge siis-status-badge--${size}`}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span className="siis-status-badge__icon">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
