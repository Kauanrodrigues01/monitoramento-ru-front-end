const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api/v1';

const DEVICE_ID_KEY = 'siis_device_id';

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  adminKey?: string;
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, adminKey, params, signal } = options;

  let url = `${BASE}${path}`;
  if (params) {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) search.set(k, String(v));
    }
    const s = search.toString();
    if (s) url += `?${s}`;
  }

  const headers: Record<string, string> = {
    'X-Device-ID': getDeviceId(),
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (adminKey) headers['X-Admin-Key'] = adminKey;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, (data as { detail?: string } | null)?.detail ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
