import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { exceptionsApi } from '../api/exceptions';
import { reportsApi } from '../api/reports';
import { restaurantsApi } from '../api/restaurants';
import { schedulesApi } from '../api/schedules';
import { snapshotsApi } from '../api/snapshots';
import type {
  QueueReport,
  QueueSnapshot,
  Restaurant,
  RestaurantSchedule,
  ScheduleException,
} from '../api/types';
import { ReportForm } from '../components/ReportForm';
import { STATUS_CONFIG } from '../components/StatusBadge';
import {
  DASHBOARD_REFRESH_MS,
  EXCEPTION_LABEL,
  MEAL_PERIOD_LABEL,
  PEAK_HOURS,
  WEEKDAY_FULL,
  WEEKDAY_SHORT_WITH_SUN as WEEKDAY_LABELS,
} from '../lib/constants';
import { DEBUG_MODE } from '../lib/debug';
import { formatTime, isAbortError } from '../lib/format';
import { getUpcomingExceptions, isOpenNow } from '../lib/schedule';
import { usePageTitle } from '../lib/usePageTitle';

// ── Mock data helpers ─────────────────────────────────────────────────────────

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateHeatmapData(seed: number) {
  const r = seededRand(seed * 999);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return WEEKDAY_LABELS.map((_, d) =>
    hours.map((h) => {
      const peak = (h >= 11 && h <= 14) || (h >= 17 && h <= 19);
      const midPeak = h >= 7 && h <= 9;
      const weekend = d >= 5;
      const base = weekend ? 0.2 : peak ? 2.8 : midPeak ? 1.2 : 0.1;
      return Math.min(3, Math.max(0, base + (r() - 0.5) * 0.8));
    }),
  );
}

function generateTimelineData(seed: number) {
  const r = seededRand(seed);
  return Array.from({ length: 24 }, (_, i) => {
    const h = (new Date().getHours() - 23 + i + 24) % 24;
    const peak = (h >= 11 && h <= 14) || (h >= 17 && h <= 19);
    const val = peak ? 2 + r() * 1 : r() * 1.5;
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      value: Math.min(3, Math.max(0, val)),
      reports: Math.floor(val * 8 + r() * 5),
    };
  });
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  return formatTime(iso);
}

function formatFreshness(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MockBadge() {
  return (
    <span className="siis-mock-badge">⚠ MOCKADO</span>
  );
}

function TimelineChart({ data }: { data: ReturnType<typeof generateTimelineData> }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 200 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: (typeof data)[0] } | null>(null);

  useEffect(() => {
    if (!wrapRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: Math.max(height, 160) });
    });
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, []);

  const pad = { top: 16, right: 16, bottom: 32, left: 38 };
  const W = dims.w - pad.left - pad.right;
  const H = dims.h - pad.top - pad.bottom;
  const n = data.length;
  const xScale = (i: number) => pad.left + (i / (n - 1)) * W;
  const yScale = (v: number) => pad.top + H - (v / 3) * H;
  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ');
  const areaD = `${pathD} L ${xScale(n - 1)} ${pad.top + H} L ${xScale(0)} ${pad.top + H} Z`;

  const STATUS_AT_VALUE = ['NO_QUEUE', 'SMALL', 'MEDIUM', 'LARGE'] as const;

  return (
    <div className="siis-timeline-wrap">
      <div className="siis-chart-area" ref={wrapRef}>
        <svg
          ref={svgRef}
          className="siis-chart-svg"
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="timeline-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#1a56db" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1a56db" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map((v) => (
            <g key={v}>
              <line
                x1={pad.left} y1={yScale(v)} x2={pad.left + W} y2={yScale(v)}
                stroke="#d1dced" strokeWidth="1" strokeDasharray="4 4"
              />
              <text
                x={pad.left - 6} y={yScale(v) + 4}
                textAnchor="end" fill="#7b96b8" fontSize="8" fontFamily="IBM Plex Mono"
              >
                {['SEM', 'PEQ', 'MED', 'GRD'][v]}
              </text>
            </g>
          ))}

          <path d={areaD} fill="url(#timeline-grad)" />
          <path d={pathD} fill="none" stroke="#1a56db" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) => (
            <circle
              key={i}
              cx={xScale(i)} cy={yScale(d.value)}
              r={i === n - 1 ? 4 : 3}
              fill={i === n - 1 ? '#1a56db' : '#ffffff'}
              stroke="#1a56db" strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ x: xScale(i), y: yScale(d.value), d })}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

          {data.filter((_, i) => i % 4 === 0).map((d, i) => (
            <text
              key={i}
              x={xScale(i * 4)} y={pad.top + H + 18}
              textAnchor="middle" fill="#7b96b8" fontSize="8" fontFamily="IBM Plex Mono"
            >
              {d.hour}
            </text>
          ))}

          {tooltip && (
            <g>
              <rect
                x={tooltip.x - 48} y={tooltip.y - 38}
                width={96} height={32} rx="4"
                fill="#ffffff" stroke="#d1dced" strokeWidth="1"
              />
              <text
                x={tooltip.x} y={tooltip.y - 21}
                textAnchor="middle" fill="#1a56db" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="600"
              >
                {STATUS_CONFIG[STATUS_AT_VALUE[Math.round(tooltip.d.value)] ?? 'NO_DATA'].label}
              </text>
              <text
                x={tooltip.x} y={tooltip.y - 10}
                textAnchor="middle" fill="#7b96b8" fontSize="8" fontFamily="IBM Plex Mono"
              >
                {tooltip.d.reports} relatos · {tooltip.d.hour}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="siis-legend">
        {(['NO_QUEUE', 'SMALL', 'MEDIUM', 'LARGE'] as const).map((k) => (
          <div key={k} className="siis-legend-item">
            <div className="siis-legend-dot" style={{ background: STATUS_CONFIG[k].color }} />
            {STATUS_CONFIG[k].label}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapPanel({ seed }: { seed: number }) {
  const data = generateHeatmapData(seed);
  const cellColor = (v: number) =>
    v < 0.5 ? '#22c55e' : v < 1.5 ? '#84cc16' : v < 2.5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="siis-heatmap-wrap" style={{ padding: 20, overflowX: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `36px repeat(${PEAK_HOURS.length}, 1fr)`,
          gap: 3,
          minWidth: 300,
        }}
      >
        <div />
        {PEAK_HOURS.map((h) => (
          <div key={h} className="siis-heatmap-label">
            {String(h).padStart(2, '0')}h
          </div>
        ))}

        {WEEKDAY_LABELS.map((day, d) => (
          <div key={d} style={{ display: 'contents' }}>
            <div
              className="siis-heatmap-label"
              style={{ justifyContent: 'flex-end', paddingRight: 6 }}
            >
              {day}
            </div>
            {PEAK_HOURS.map((h) => {
              const v = data[d][h];
              const statusKey = (['NO_QUEUE', 'SMALL', 'MEDIUM', 'LARGE'] as const)[Math.round(v)] ?? 'NO_QUEUE';
              return (
                <div
                  key={h}
                  className="siis-heatmap-cell"
                  style={{ background: cellColor(v), opacity: 0.15 + (v / 3) * 0.85 }}
                  title={`${day} ${h}h — ${STATUS_CONFIG[statusKey].label}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="siis-legend" style={{ marginTop: 16 }}>
        {([
          ['#22c55e', 'Sem fila'],
          ['#84cc16', 'Pequena'],
          ['#f59e0b', 'Média'],
          ['#ef4444', 'Grande'],
        ] as [string, string][]).map(([c, l]) => (
          <div key={l} className="siis-legend-item">
            <div className="siis-legend-dot" style={{ background: c }} />
            {l}
          </div>
        ))}
        <span
          className="siis-legend-item"
          style={{ marginLeft: 'auto', color: 'var(--text3)', fontStyle: 'italic' }}
        >
          horários de pico
        </span>
      </div>
    </div>
  );
}

function FeedPanel({ reports }: { reports: QueueReport[] }) {
  if (reports.length === 0) {
    return <div className="siis-feed-empty">AGUARDANDO RELATOS...</div>;
  }

  return (
    <div>
      {reports.slice(0, 8).map((r) => {
        const cfg = STATUS_CONFIG[r.status];
        return (
          <div key={r.public_id} className="siis-feed-item">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="siis-feed-status"
                style={{ color: cfg.color, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cfg.color,
                    flexShrink: 0,
                  }}
                />
                {cfg.label}
              </div>
              <div className="siis-feed-meta">
                {MEAL_PERIOD_LABEL[r.meal_period]}
              </div>
            </div>
            <div className="siis-feed-time">{formatRelative(r.created_at)}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveExceptionBanner({ exception }: { exception: ScheduleException }) {
  const isClosed = exception.exception_type === 'CLOSED';
  const periodLabel = exception.meal_period ? MEAL_PERIOD_LABEL[exception.meal_period] : null;

  const title = isClosed
    ? periodLabel ? `Fechado — ${periodLabel}` : 'Fechado hoje'
    : periodLabel ? `Horário especial — ${periodLabel}` : 'Horário especial';

  return (
    <div className={`siis-exception-banner ${isClosed ? 'closed' : 'special'}`}>
      <span className="siis-exception-banner__icon" aria-hidden="true">
        {isClosed ? '⛔' : '⏰'}
      </span>
      <div>
        <div className="siis-exception-banner__title">{title}</div>
        {exception.opens_at && exception.closes_at && (
          <div className="siis-exception-banner__detail">
            {exception.opens_at.slice(0, 5)} – {exception.closes_at.slice(0, 5)}
          </div>
        )}
        {exception.reason && (
          <div className="siis-exception-banner__detail">{exception.reason}</div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RestaurantDetail() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [reports, setReports] = useState<QueueReport[]>([]);
  const [schedules, setSchedules] = useState<RestaurantSchedule[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [activeException, setActiveException] = useState<ScheduleException | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulePeriod, setSchedulePeriod] = useState<'LUNCH' | 'DINNER'>(() =>
    new Date().getHours() >= 17 ? 'DINNER' : 'LUNCH',
  );

  usePageTitle(restaurant?.name ?? '');

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (!id) return;
    try {
      const [rest, sched] = await Promise.all([
        restaurantsApi.get(id, signal),
        schedulesApi.list(id, undefined, signal),
      ]);
      setRestaurant(rest);
      setSchedules(sched.filter((s) => s.is_active));

      const [snap, reps, excs, activeExc] = await Promise.allSettled([
        snapshotsApi.get(id, signal),
        reportsApi.recent(id, signal),
        exceptionsApi.list(id, undefined, signal),
        exceptionsApi.getCurrent(id, signal),
      ]);
      if (snap.status === 'fulfilled') setSnapshot(snap.value);
      if (reps.status === 'fulfilled') setReports(reps.value);
      if (excs.status === 'fulfilled') setExceptions(excs.value);
      if (activeExc.status === 'fulfilled') setActiveException(activeExc.value.exception);
      setError(null);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('[RestaurantDetail] Falha ao carregar dados:', err);
      const isNotFound = err instanceof ApiError && err.status === 404;
      setError(isNotFound
        ? 'Este restaurante não está disponível.'
        : 'Não foi possível carregar os dados. Tente novamente em alguns instantes.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const ac = new AbortController();
    loadData(ac.signal);
    const timer = setInterval(() => loadData(ac.signal), DASHBOARD_REFRESH_MS);
    return () => { clearInterval(timer); ac.abort(); };
  }, [loadData]);

  const handleReportSuccess = () => {
    setShowForm(false);
    setTimeout(loadData, 1500);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 20, width: 160, borderRadius: 4, background: 'var(--surface3)' }} />
        <div className="siis-grid-main">
          <div className="siis-panel" style={{ minHeight: 340 }} />
          <div className="siis-panel" style={{ minHeight: 260 }} />
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div
        className="siis-panel"
        style={{ padding: '48px 20px', textAlign: 'center' }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
          {error ?? 'RESTAURANTE NÃO ENCONTRADO'}
        </div>
        <Link to="/" className="siis-breadcrumb" style={{ fontWeight: 700, color: 'var(--blue)' }}>
          ← VOLTAR AO INÍCIO
        </Link>
      </div>
    );
  }

  const status = snapshot?.current_status ?? 'NO_DATA';
  const cfg = STATUS_CONFIG[status];
  const openNow = schedules.length > 0 ? isOpenNow(schedules, exceptions) : null;
  const upcomingExceptions = getUpcomingExceptions(exceptions, 14);

  const seed = restaurant.public_id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const timelineData = generateTimelineData(seed);

  const freshnessMin = snapshot?.data_freshness_minutes ?? null;

  return (
    <div>
      {/* DEBUG banner */}
      {DEBUG_MODE && (
        <div className="siis-debug-banner">
          <span aria-hidden="true">⚠</span> DEBUG MODE ATIVO — RESTRIÇÕES DE HORÁRIO DESATIVADAS
        </div>
      )}

      {/* Breadcrumb */}
      <Link to="/" className="siis-breadcrumb">← TODOS OS RESTAURANTES</Link>

      {/* Main grid */}
      <div className="siis-grid-main">
        {/* Left: Status + Form */}
        <div className="siis-panel siis-panel--flex-col">
          <div className="siis-panel-header">
            <span className="siis-panel-title">STATUS ATUAL</span>
            <span className="siis-panel-tag">{restaurant.name.toUpperCase()}</span>
          </div>

          {/* Status display */}
          <div className="siis-status-main" style={{ background: cfg.bg }}>
            <div className="siis-status-glow" style={{ background: cfg.color }} />
            <div className="siis-status-icon" style={{ color: cfg.color }}>{cfg.icon}</div>
            <div className="siis-status-label" style={{ color: cfg.color }}>{cfg.label}</div>
            <div className="siis-status-sub">STATUS ATUAL DO RU</div>

            {/* Freshness badge */}
            <div className="siis-freshness-wrap">
              {freshnessMin != null ? (
                freshnessMin <= 10 ? (
                  <span className="siis-freshness fresh">
                    ● DADOS RECENTES · {formatFreshness(freshnessMin)}
                  </span>
                ) : (
                  <span className="siis-freshness stale">
                    ⚠ DADOS ANTIGOS · {formatFreshness(freshnessMin)}
                  </span>
                )
              ) : (
                <span className="siis-freshness stale">⚠ SEM DADOS</span>
              )}
            </div>

            {activeException && <ActiveExceptionBanner exception={activeException} />}
          </div>

          {/* Meta grid */}
          <div className="siis-meta-grid">
            <div className="siis-meta-cell">
              <span className="siis-meta-label">RELATOS/15MIN</span>
              <span
                className={`siis-meta-value ${
                  (snapshot?.reports_last_15m ?? 0) > 5 ? 'good' : 'warn'
                }`}
              >
                {snapshot?.reports_last_15m ?? 0}
              </span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">ABERTO AGORA</span>
              <span
                className={`siis-meta-value ${
                  openNow === null ? '' : openNow ? 'good' : 'bad'
                }`}
              >
                {openNow === null ? '—' : openNow ? 'SIM' : 'NÃO'}
              </span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">ÚLTIMO RELATO</span>
              <span className="siis-meta-value">
                {snapshot?.last_report_at ? formatTime(snapshot.last_report_at) : '--:--'}
              </span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">PERÍODO</span>
              <span className="siis-meta-value">
                {snapshot?.meal_period
                  ? MEAL_PERIOD_LABEL[snapshot.meal_period].toUpperCase()
                  : '—'}
              </span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">CONFIANÇA</span>
              <span
                className={`siis-meta-value ${
                  snapshot == null
                    ? ''
                    : snapshot.confidence_score >= 0.75
                      ? 'good'
                      : snapshot.confidence_score >= 0.5
                        ? 'warn'
                        : 'bad'
                }`}
              >
                {snapshot != null ? `${Math.round(snapshot.confidence_score * 100)}%` : '—'}
              </span>
            </div>
            <div className="siis-meta-cell">
              <span className="siis-meta-label">DADOS HÁ</span>
              <span
                className={`siis-meta-value ${
                  freshnessMin == null ? '' : freshnessMin <= 10 ? 'good' : 'warn'
                }`}
              >
                {freshnessMin != null ? formatFreshness(freshnessMin) : '—'}
              </span>
            </div>
          </div>

          {/* Report form */}
          {showForm ? (
            <>
              <ReportForm
                restaurantId={restaurant.public_id}
                restaurantName={restaurant.name}
                onSuccess={handleReportSuccess}
              />
              <button type="button" onClick={() => setShowForm(false)} className="siis-cancel-btn">
                CANCELAR
              </button>
            </>
          ) : openNow === false && !DEBUG_MODE ? (
            <div className="siis-closed-footer">
              <span aria-hidden="true">⛔</span> RU FECHADO — RELATOS DESATIVADOS
            </div>
          ) : (
            <div className="siis-open-footer">
              <button type="button" onClick={() => setShowForm(true)} className="siis-submit-btn">
                INFORMAR SITUAÇÃO
              </button>
            </div>
          )}
        </div>

        {/* Right: Timeline (MOCKED) */}
        <div className="siis-panel siis-panel--flex-col">
          <div className="siis-panel-header">
            <span className="siis-panel-title">HISTÓRICO · ÚLTIMAS 24H</span>
            <MockBadge />
          </div>
          <div className="siis-panel__body">
            <TimelineChart data={timelineData} />
          </div>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="siis-grid-bottom">
        {/* Heatmap (MOCKED) */}
        <div className="siis-panel">
          <div className="siis-panel-header">
            <span className="siis-panel-title">HEATMAP SEMANAL</span>
            <MockBadge />
          </div>
          <HeatmapPanel seed={seed} />
        </div>

        {/* Feed (real data) */}
        <div className="siis-panel">
          <div className="siis-panel-header">
            <span className="siis-panel-title">FEED DE RELATOS</span>
            <span className="siis-panel-tag">
              {openNow === false && !DEBUG_MODE
                ? 'RESTAURANTE FECHADO'
                : `AO VIVO · ${reports.length} REGISTROS`}
            </span>
          </div>
          {openNow === false && !DEBUG_MODE ? (
            <div className="siis-feed-empty">
              <span aria-hidden="true">⛔</span> RESTAURANTE FECHADO NESTE PERÍODO
            </div>
          ) : (
            <FeedPanel reports={reports} />
          )}
        </div>
      </div>

      {/* Schedules */}
      {schedules.length > 0 && (
        <div className="siis-panel" style={{ marginBottom: 16 }}>
          <div className="siis-panel-header">
            <span className="siis-panel-title">HORÁRIOS DE FUNCIONAMENTO</span>
            <div className="siis-period-tabs">
              {(['LUNCH', 'DINNER'] as const).map((period) => (
                <button
                  type="button"
                  key={period}
                  onClick={() => setSchedulePeriod(period)}
                  className={`siis-period-tab${schedulePeriod === period ? ' active' : ''}`}
                >
                  {MEAL_PERIOD_LABEL[period]}
                </button>
              ))}
            </div>
          </div>
          <div>
            {schedules
              .filter((s) => s.meal_period === schedulePeriod)
              .map((s) => (
                <div key={s.public_id} className="siis-schedule-row">
                  <span className="siis-schedule-row__day">{WEEKDAY_FULL[s.weekday]}</span>
                  <span className="siis-schedule-row__time">
                    {s.opens_at.slice(0, 5)} – {s.closes_at.slice(0, 5)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Upcoming exceptions */}
      {upcomingExceptions.length > 0 && (
        <div className="siis-panel" style={{ marginBottom: 16 }}>
          <div className="siis-panel-header">
            <span className="siis-panel-title">EXCEÇÕES PRÓXIMAS</span>
            <span className="siis-panel-tag">{upcomingExceptions.length} REGISTROS</span>
          </div>
          <div>
            {upcomingExceptions.map((ex) => (
              <div key={ex.public_id} className="siis-exception-row">
                <span className="siis-exception-row__date">
                  {new Date(ex.exception_date + 'T12:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="siis-exception-row__label">
                    {EXCEPTION_LABEL[ex.exception_type]}
                    {ex.meal_period
                      ? ` — ${MEAL_PERIOD_LABEL[ex.meal_period]}`
                      : ' — Dia inteiro'}
                  </div>
                  {ex.opens_at && ex.closes_at && (
                    <div className="siis-exception-row__detail">
                      {ex.opens_at.slice(0, 5)} – {ex.closes_at.slice(0, 5)}
                    </div>
                  )}
                  {ex.reason && (
                    <div className="siis-exception-row__detail">{ex.reason}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
