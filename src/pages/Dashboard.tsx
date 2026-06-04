import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exceptionsApi } from '../api/exceptions';
import { restaurantsApi } from '../api/restaurants';
import { schedulesApi } from '../api/schedules';
import { snapshotsApi } from '../api/snapshots';
import type {
  QueueSnapshotBulkItem,
  Restaurant,
  RestaurantSchedule,
  ScheduleException,
  SnapshotUpdatedEvent,
} from '../api/types';
import { RestaurantCard } from '../components/RestaurantCard';
import { CAMPUS_LABELS } from '../lib/constants';
import { isAbortError } from '../lib/format';
import { isOpenNow } from '../lib/schedule';
import { useSnapshotWebSocket } from '../lib/useSnapshotWebSocket';
import { usePageTitle } from '../lib/usePageTitle';

function Skeleton() {
  return (
    <div className="siis-card">
      <div className="siis-card-bar bg-slate-200" />
      <div className="siis-card-body" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
        <div style={{ height: 12, width: 140, borderRadius: 4, background: 'var(--surface3)' }} />
        <div style={{ height: 9, width: 90, borderRadius: 4, background: 'var(--border)', marginTop: 4 }} />
        <div style={{ height: 22, width: 110, borderRadius: 20, background: 'var(--surface3)', marginTop: 8 }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  usePageTitle('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [snapshots, setSnapshots] = useState<Map<string, QueueSnapshotBulkItem>>(new Map());
  const [openNowMap, setOpenNowMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const schedulesLoadedRef = useRef(false);
  const schedulesRef = useRef<Map<string, RestaurantSchedule[]>>(new Map());
  const exceptionsRef = useRef<Map<string, ScheduleException[]>>(new Map());

  const recalcOpenNow = useCallback((list: Restaurant[]) => {
    const map = new Map<string, boolean>();
    for (const r of list) {
      const s = schedulesRef.current.get(r.public_id);
      const e = exceptionsRef.current.get(r.public_id);
      if (s) map.set(r.public_id, isOpenNow(s, e ?? []));
    }
    setOpenNowMap(map);
  }, []);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const list = await restaurantsApi.list(signal);
      setRestaurants(list);

      if (list.length > 0) {
        const ids = list.map((r) => r.public_id);
        const bulk = await snapshotsApi.bulk(ids, signal).catch(() => [] as QueueSnapshotBulkItem[]);
        const map = new Map<string, QueueSnapshotBulkItem>();
        for (const snap of bulk) map.set(snap.restaurant_public_id, snap);
        setSnapshots(map);
      }

      setLastUpdated(new Date());
      setError(null);
      return list;
    } catch (err) {
      if (isAbortError(err)) return [] as Restaurant[];
      console.error('[Dashboard] Falha ao carregar dados:', err);
      setError('Não foi possível carregar os dados. Tente novamente em alguns instantes.');
      return [] as Restaurant[];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    const run = async () => {
      const list = await loadData(ac.signal);

      if (!schedulesLoadedRef.current && list.length > 0) {
        schedulesLoadedRef.current = true;
        const today = new Date().toISOString().slice(0, 10);
        await Promise.allSettled(
          list.map(async (r) => {
            const [schedules, exceptions] = await Promise.all([
              schedulesApi.list(r.public_id, undefined, ac.signal).catch(() => [] as RestaurantSchedule[]),
              exceptionsApi.list(r.public_id, today, ac.signal).catch(() => [] as ScheduleException[]),
            ]);
            schedulesRef.current.set(r.public_id, schedules);
            exceptionsRef.current.set(r.public_id, exceptions);
          }),
        );
      }

      if (list.length > 0) recalcOpenNow(list);
    };

    run();
    return () => { ac.abort(); };
  }, [loadData, recalcOpenNow]);

  useSnapshotWebSocket((event: SnapshotUpdatedEvent) => {
    setSnapshots((prev) => {
      const existing = prev.get(event.restaurant_public_id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(event.restaurant_public_id, {
        ...existing,
        meal_period: event.meal_period,
        current_status: event.current_status,
        reports_last_15m: event.reports_last_15m,
        last_report_at: event.last_report_at,
        confidence_score: event.confidence_score,
        updated_at: event.updated_at,
      });
      return next;
    });
    setLastUpdated(new Date());
  });

  const campusGroups = useMemo(
    () =>
      restaurants.reduce(
        (acc, r) => {
          if (!acc[r.campus]) acc[r.campus] = [];
          acc[r.campus].push(r);
          return acc;
        },
        {} as Record<string, Restaurant[]>,
      ),
    [restaurants],
  );

  return (
    <div>
      {/* Page header */}
      <div
        className="siis-panel"
        style={{ marginBottom: 24 }}
      >
        <div className="siis-panel-header">
          <span className="siis-panel-title">RESTAURANTES UNIVERSITÁRIOS</span>
          {lastUpdated && (
            <span className="siis-panel-tag">
              ATUALIZADO {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="siis-error-bar" style={{ marginBottom: 20 }}>
          <span aria-hidden="true">⚠</span>
          <div style={{ flex: 1 }}>
            <strong>Serviço temporariamente indisponível</strong>
            <div style={{ marginTop: 2, opacity: 0.8 }}>{error}</div>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              color: '#991b1b',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              letterSpacing: 1,
            }}
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="siis-cards-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div
          className="siis-panel"
          style={{ padding: '48px 20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🍽️</div>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--text3)',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            NENHUM RESTAURANTE CADASTRADO
          </div>
        </div>
      ) : (
        <div className="siis-campuses-grid">
          {Object.entries(campusGroups).map(([campus, list]) => (
            <div key={campus}>
              <div className="siis-campus-label">
                {CAMPUS_LABELS[campus] ?? campus}
                <span
                  style={{
                    marginLeft: 10,
                    opacity: 0.5,
                    fontWeight: 400,
                    letterSpacing: 1,
                  }}
                >
                  · {list.length} RU{list.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="siis-cards-grid">
                {list.map((r) => (
                  <RestaurantCard
                    key={r.public_id}
                    restaurant={r}
                    snapshot={snapshots.get(r.public_id)}
                    openNow={openNowMap.get(r.public_id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
