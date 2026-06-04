import { apiFetch } from './client';
import type { Restaurant, RestaurantCreate, RestaurantUpdate } from './types';

export const restaurantsApi = {
  list: (signal?: AbortSignal) => apiFetch<Restaurant[]>('/restaurants/', { signal }),
  get: (id: string, signal?: AbortSignal) => apiFetch<Restaurant>(`/restaurants/${id}`, { signal }),
  create: (data: RestaurantCreate, adminKey: string) =>
    apiFetch<Restaurant>('/restaurants/', { method: 'POST', body: data, adminKey }),
  update: (id: string, data: RestaurantUpdate, adminKey: string) =>
    apiFetch<Restaurant>(`/restaurants/${id}`, { method: 'PATCH', body: data, adminKey }),
};
