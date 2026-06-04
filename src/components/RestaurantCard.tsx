import { Link } from 'react-router-dom';
import type { QueueSnapshotBulkItem, Restaurant } from '../api/types';
import { CAMPUS_LABELS } from '../lib/constants';
import { formatTime } from '../lib/format';
import { STATUS_CONFIG, StatusBadge } from './StatusBadge';

type Props = {
  restaurant: Restaurant;
  snapshot?: QueueSnapshotBulkItem;
  openNow?: boolean;
};

export function RestaurantCard({ restaurant, snapshot, openNow }: Props) {
  const status = snapshot?.current_status ?? 'NO_DATA';
  const cfg = STATUS_CONFIG[status];

  return (
    <Link to={`/restaurants/${restaurant.public_id}`} className="siis-card">
      <div className={`siis-card-bar ${cfg.bar}`} />
      <div className="siis-card-body">
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <span className="siis-card-name">{restaurant.name}</span>
            {!restaurant.is_active && (
              <span className="siis-mock-badge">inativo</span>
            )}
          </div>
          <div className="siis-card-campus" style={{ marginTop: 3 }}>
            {CAMPUS_LABELS[restaurant.campus] ?? restaurant.campus}
          </div>
        </div>

        <div className="siis-card-footer">
          <StatusBadge status={status} size="sm" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            {openNow !== undefined && (
              <span className={`siis-open-badge ${openNow ? 'open' : 'closed'}`}>
                {openNow ? 'ABERTO' : 'FECHADO'}
              </span>
            )}
            {snapshot && (
              <div className="siis-reports-count">
                {snapshot.reports_last_15m} relatos
                {snapshot.last_report_at && (
                  <> · {formatTime(snapshot.last_report_at)}</>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
