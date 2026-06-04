import { apiFetch } from './client';
import type { QueueSnapshot, QueueSnapshotBulkItem } from './types';

export const snapshotsApi = {
  get: (restaurantId: string, signal?: AbortSignal) =>
    apiFetch<QueueSnapshot>(`/restaurants/${restaurantId}/status`, { signal }),
  bulk: (ids: string[], signal?: AbortSignal) =>
    apiFetch<QueueSnapshotBulkItem[]>('/restaurants/status/bulk', {
      params: { ids: ids.join(',') },
      signal,
    }),
};
