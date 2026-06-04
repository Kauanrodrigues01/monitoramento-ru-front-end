import { apiFetch } from './client';
import type { MealPeriodEnum, RestaurantSchedule, RestaurantScheduleCreate, RestaurantScheduleUpdate } from './types';

export const schedulesApi = {
  list: (restaurantId: string, meal_period?: MealPeriodEnum, signal?: AbortSignal) =>
    apiFetch<RestaurantSchedule[]>(`/restaurants/${restaurantId}/schedules`, {
      params: meal_period ? { meal_period } : undefined,
      signal,
    }),
  create: (restaurantId: string, data: RestaurantScheduleCreate, adminKey: string) =>
    apiFetch<RestaurantSchedule>(`/restaurants/${restaurantId}/schedules`, {
      method: 'POST',
      body: data,
      adminKey,
    }),
  update: (restaurantId: string, scheduleId: string, data: RestaurantScheduleUpdate, adminKey: string) =>
    apiFetch<RestaurantSchedule>(`/restaurants/${restaurantId}/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: data,
      adminKey,
    }),
};
