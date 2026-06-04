import { apiFetch } from './client';
import type { QueueReport, QueueReportCreate } from './types';

export const reportsApi = {
  create: (restaurantId: string, data: QueueReportCreate) =>
    apiFetch<QueueReport>(`/restaurants/${restaurantId}/reports`, {
      method: 'POST',
      body: data,
    }),
  recent: (restaurantId: string, signal?: AbortSignal) =>
    apiFetch<QueueReport[]>(`/restaurants/${restaurantId}/reports/recent`, { signal }),
};
