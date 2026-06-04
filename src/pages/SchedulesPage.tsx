import { useCallback, useEffect, useState } from 'react';
import { exceptionsApi } from '../api/exceptions';
import { restaurantsApi } from '../api/restaurants';
import { schedulesApi } from '../api/schedules';
import type { Restaurant, RestaurantSchedule, ScheduleException } from '../api/types';
import {
  CAMPUS_LABELS_TITLE as CAMPUS_LABELS,
  EXCEPTION_LABEL,
  MEAL_PERIOD_LABEL,
  WEEKDAY_SHORT as WEEKDAY_LABELS,
} from '../lib/constants';
import { currentWeekday, getUpcomingExceptions } from '../lib/schedule';
import { usePageTitle } from '../lib/usePageTitle';

type RestaurantData = {
  restaurant: Restaurant;
  schedules: RestaurantSchedule[];
  exceptions: ScheduleException[];
};

function ScheduleMatrix({ schedules }: { schedules: RestaurantSchedule[] }) {
  const today = currentWeekday();

  return (
    <div className="siis-sched-table">
      <table>
        <thead>
          <tr>
            <th>Período</th>
            {WEEKDAY_LABELS.map((d, i) => (
              <th key={i} className={i === today ? 'is-today' : ''}>
                {d}
                {i === today && <span aria-hidden="true"> ·</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['LUNCH', 'DINNER'] as const).map((period) => (
            <tr key={period}>
              <td>{MEAL_PERIOD_LABEL[period]}</td>
              {Array.from({ length: 6 }).map((_, dayIdx) => {
                const s = schedules.find(
                  (s) => s.weekday === dayIdx && s.meal_period === period && s.is_active,
                );
                return (
                  <td key={dayIdx}>
                    {s ? (
                      <span className={`siis-sched-time${dayIdx === today ? ' is-today' : ''}`}>
                        {s.opens_at.slice(0, 5)}
                        <span className="siis-sched-time__sub">{s.closes_at.slice(0, 5)}</span>
                      </span>
                    ) : (
                      <span className="siis-sched-dash">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExceptionsList({ exceptions }: { exceptions: ScheduleException[] }) {
  const upcoming = getUpcomingExceptions(exceptions, 14);
  if (upcoming.length === 0) return null;

  return (
    <div className="siis-sched-exc">
      <p className="siis-sched-exc__label">Exceções próximas</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {upcoming.map((ex) => (
          <li key={ex.public_id} className="siis-sched-exc-item">
            <span className="siis-sched-exc-date">
              {new Date(ex.exception_date + 'T12:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
            <div>
              <p className="siis-sched-exc-label">
                {EXCEPTION_LABEL[ex.exception_type]}
                {ex.meal_period
                  ? ` · ${MEAL_PERIOD_LABEL[ex.meal_period]}`
                  : ' · Dia inteiro'}
              </p>
              {ex.opens_at && ex.closes_at && (
                <p className="siis-sched-exc-detail">
                  {ex.opens_at.slice(0, 5)} – {ex.closes_at.slice(0, 5)}
                </p>
              )}
              {ex.reason && <p className="siis-sched-exc-detail">{ex.reason}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RestaurantScheduleCard({ data }: { data: RestaurantData }) {
  const { restaurant, schedules, exceptions } = data;
  const today = currentWeekday();
  const todaySchedules = schedules.filter((s) => s.is_active && s.weekday === today);

  return (
    <div className="siis-sched-card">
      <div className="siis-sched-card__header">
        <div>
          <h3 className="siis-sched-card__title">{restaurant.name}</h3>
          {todaySchedules.length > 0 ? (
            <p className="siis-sched-card__meta">
              Hoje:{' '}
              {todaySchedules
                .map((s) => `${s.opens_at.slice(0, 5)}–${s.closes_at.slice(0, 5)}`)
                .join(' e ')}
            </p>
          ) : (
            <p className="siis-sched-card__meta">Sem funcionamento hoje</p>
          )}
        </div>
        {!restaurant.is_active && (
          <span className="siis-inactive-tag">inativo</span>
        )}
      </div>
      <div className="siis-sched-card__body">
        <ScheduleMatrix schedules={schedules} />
        <ExceptionsList exceptions={exceptions} />
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="siis-sched-skeleton" />;
}

export function SchedulesPage() {
  usePageTitle('Horários dos Restaurantes');
  const [data, setData] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const restaurants = await restaurantsApi.list();
      const results = await Promise.all(
        restaurants.map(async (r) => {
          const [schedules, exceptions] = await Promise.all([
            schedulesApi.list(r.public_id).catch(() => [] as RestaurantSchedule[]),
            exceptionsApi.list(r.public_id).catch(() => [] as ScheduleException[]),
          ]);
          return { restaurant: r, schedules, exceptions };
        }),
      );
      setData(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const campusGroups = data.reduce(
    (acc, d) => {
      const c = d.restaurant.campus;
      if (!acc[c]) acc[c] = [];
      acc[c].push(d);
      return acc;
    },
    {} as Record<string, RestaurantData[]>,
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="siis-page-header">
        <h1 className="siis-page-title">Horários de funcionamento</h1>
        <p className="siis-page-subtitle">
          Horários regulares e exceções de todos os restaurantes
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="siis-sched-empty">
          <p className="siis-sched-empty__icon">📅</p>
          <p className="siis-sched-empty__text">Nenhum restaurante cadastrado</p>
        </div>
      ) : (
        Object.entries(campusGroups).map(([campus, items]) => (
          <div key={campus} className="siis-sched-section">
            <h2 className="siis-sched-section-title">
              {CAMPUS_LABELS[campus] ?? campus}
            </h2>
            {items.map((d) => (
              <RestaurantScheduleCard key={d.restaurant.public_id} data={d} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
