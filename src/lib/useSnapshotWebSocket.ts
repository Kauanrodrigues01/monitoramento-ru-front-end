import { useEffect, useRef } from 'react';
import type { SnapshotUpdatedEvent } from '../api/types';

const _apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api/v1';
const WS_URL = _apiBase.replace(/^http/, 'ws') + '/ws/snapshots';

const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;

export function useSnapshotWebSocket(onEvent: (event: SnapshotUpdatedEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let delay = RECONNECT_BASE_MS;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        delay = RECONNECT_BASE_MS;
      };

      ws.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string) as SnapshotUpdatedEvent;
          if (data.type === 'snapshot_updated') onEventRef.current(data);
        } catch {
          // mensagem malformada — ignora
        }
      };

      ws.onerror = () => {
        // onclose será disparado na sequência
      };

      ws.onclose = () => {
        if (destroyed) return;
        timer = setTimeout(() => {
          delay = Math.min(delay * 2, RECONNECT_MAX_MS);
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, []);
}
