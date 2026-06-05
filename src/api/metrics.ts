import { apiFetch } from './client';
import type { MetricsSummary } from './types';

export const metricsApi = {
  summary: (signal?: AbortSignal) =>
    apiFetch<MetricsSummary>('/metrics/summary', { signal }),
};
