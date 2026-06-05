import type { MetricsSummary, SnapshotStatusEnum } from '../api/types';
import { STATUS_CONFIG } from './StatusBadge';

type Props = {
  metrics: MetricsSummary | null;
  loading: boolean;
};

const STATUS_ORDER: SnapshotStatusEnum[] = [
  'NO_QUEUE', 'SMALL', 'MEDIUM', 'LARGE', 'FOOD_ENDED', 'NO_DATA',
];

function SkeletonCell() {
  return (
    <div className="siis-meta-cell" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
      <div style={{ height: 8, width: 64, borderRadius: 4, background: 'var(--border)' }} />
      <div style={{ height: 22, width: 40, borderRadius: 4, background: 'var(--surface3)', marginTop: 4 }} />
    </div>
  );
}

function confidenceClass(value: number | null): string {
  if (value === null) return '';
  if (value >= 0.7) return 'good';
  if (value >= 0.4) return 'warn';
  return 'bad';
}

export function MetricsBanner({ metrics, loading }: Props) {
  if (!loading && !metrics) return null;

  const avgConf = metrics?.avg_confidence ?? null;
  const distribution = metrics?.status_distribution ?? {};
  const activeStatuses = STATUS_ORDER.filter((s) => (distribution[s] ?? 0) > 0);

  return (
    <div className="siis-panel" style={{ marginBottom: 20 }}>
      <div className="siis-panel-header">
        <span className="siis-panel-title">VISÃO GERAL DO SISTEMA</span>
      </div>

      {loading ? (
        <div className="siis-meta-grid siis-metrics-strip">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCell key={i} />)}
        </div>
      ) : (
        <>
          <div className="siis-meta-grid siis-metrics-strip">
            <div className="siis-meta-cell">
              <span className="siis-meta-label">RESTAURANTES ATIVOS</span>
              <span className="siis-meta-value">{metrics!.total_active_restaurants}</span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">ABERTOS AGORA</span>
              <span className={`siis-meta-value ${metrics!.open_now > 0 ? 'good' : ''}`}>
                {metrics!.open_now}
              </span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">RELATOS (15 MIN)</span>
              <span className="siis-meta-value">{metrics!.reports_last_15m}</span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">RELATOS HOJE</span>
              <span className="siis-meta-value">{metrics!.reports_today}</span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">CONFIANÇA MÉDIA</span>
              <span className={`siis-meta-value ${confidenceClass(avgConf)}`}>
                {avgConf === null ? '—' : `${Math.round(avgConf * 100)}%`}
              </span>
            </div>
          </div>

          {activeStatuses.length > 0 && (
            <div
              style={{
                padding: '8px 18px 10px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                background: 'var(--surface2)',
              }}
            >
              {activeStatuses.map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <span
                    key={s}
                    className="siis-status-badge siis-status-badge--sm"
                    style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
                  >
                    <span className="siis-status-badge__icon">{cfg.icon}</span>
                    {cfg.label}: {distribution[s]}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
