import { apiFetch } from './client';
import type { ActiveScheduleException, ScheduleException, ScheduleExceptionCreate, ScheduleExceptionUpdate } from './types';

export const exceptionsApi = {
  list: (restaurantId: string, exception_date?: string, signal?: AbortSignal) =>
    apiFetch<ScheduleException[]>(`/restaurants/${restaurantId}/schedule-exceptions`, {
      params: exception_date ? { exception_date } : undefined,
      signal,
    }),
  getCurrent: (restaurantId: string, signal?: AbortSignal) =>
    apiFetch<ActiveScheduleException>(`/restaurants/${restaurantId}/schedule-exceptions/current`, { signal }),
  create: (restaurantId: string, data: ScheduleExceptionCreate, adminKey: string) =>
    apiFetch<ScheduleException>(`/restaurants/${restaurantId}/schedule-exceptions`, {
      method: 'POST',
      body: data,
      adminKey,
    }),
  update: (restaurantId: string, exceptionId: string, data: ScheduleExceptionUpdate, adminKey: string) =>
    apiFetch<ScheduleException>(`/restaurants/${restaurantId}/schedule-exceptions/${exceptionId}`, {
      method: 'PATCH',
      body: data,
      adminKey,
    }),
};
