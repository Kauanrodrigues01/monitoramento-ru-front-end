import { useState } from 'react';
import { ApiError } from '../api/client';
import { reportsApi } from '../api/reports';
import type { ReportStatusEnum } from '../api/types';
import { useToast } from '../context/ToastContext';
import { GEO_TIMEOUT_MS } from '../lib/constants';
import { buildGeoSignature } from '../lib/geo';
import { STATUS_CONFIG } from './StatusBadge';
import { LocationModal } from './LocationModal';

function friendlyApiMessage(err: ApiError): string {
  const d = err.detail.toLowerCase();
  if (d.includes('geofence') || d.includes('distância') || d.includes('longe'))
    return 'Você precisa estar próximo ao restaurante para enviar um relato.';
  if (d.includes('cooldown') || d.includes('aguarde') || d.includes('recentemente'))
    return 'Você já enviou um relato recentemente. Aguarde alguns minutos.';
  if (err.status === 422)
    return 'Dados inválidos. Verifique sua seleção e tente novamente.';
  if (err.status === 401 || err.status === 403)
    return 'Ação não permitida. Tente novamente.';
  if (err.status >= 500)
    return 'O servidor encontrou um problema. Tente novamente em alguns instantes.';
  return 'Não foi possível enviar o relato. Tente novamente em alguns instantes.';
}

const REPORT_STATUSES: ReportStatusEnum[] = ['NO_QUEUE', 'SMALL', 'MEDIUM', 'LARGE', 'FOOD_ENDED'];

const REPORT_OPTIONS = REPORT_STATUSES.map((value) => ({
  value,
  label: STATUS_CONFIG[value].label,
  color: STATUS_CONFIG[value].color,
  bg:    STATUS_CONFIG[value].bg,
  border: STATUS_CONFIG[value].color,
}));

type State = 'idle' | 'show_location_modal' | 'locating' | 'submitting' | 'error';

type Props = {
  restaurantId: string;
  restaurantName: string;
  onSuccess?: () => void;
};

export function ReportForm({ restaurantId, restaurantName, onSuccess }: Props) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState<ReportStatusEnum | null>(null);
  const [state, setState] = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const doGeoAndSubmit = async (statusToSubmit: ReportStatusEnum) => {
    setState('locating');
    setErrorMsg(null);

    let position: GeolocationPosition;
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: GEO_TIMEOUT_MS,
        }),
      );
    } catch (geoErr) {
      console.error('[ReportForm] Falha ao obter localização:', geoErr);
      setState('error');
      setErrorMsg('Não foi possível obter sua localização. Permita o acesso à localização nas configurações do seu dispositivo e tente novamente.');
      return;
    }

    const { latitude, longitude, accuracy } = position.coords;
    setState('submitting');

    try {
      const { geo_signature, geo_timestamp } = await buildGeoSignature(
        latitude,
        longitude,
        accuracy,
      );
      await reportsApi.create(restaurantId, {
        status: statusToSubmit,
        lat: latitude,
        lng: longitude,
        accuracy_m: accuracy,
        is_mock_location: false,
        geo_signature,
        geo_timestamp,
      });
      showToast('Relato enviado! Obrigado por contribuir.', 'success');
      onSuccess?.();
    } catch (err) {
      console.error('[ReportForm] Falha ao enviar relato:', err);
      setState('error');
      setErrorMsg(
        err instanceof ApiError
          ? friendlyApiMessage(err)
          : 'Não foi possível enviar o relato. Tente novamente em alguns instantes.',
      );
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;

    // Verifica se a permissão de geolocalização já foi concedida.
    // Se sim, pula o modal explicativo e vai direto ao GPS.
    // Se não (ou se a Permissions API não estiver disponível), mostra o modal primeiro.
    let permissionAlreadyGranted = false;
    try {
      const perm = await navigator.permissions.query({ name: 'geolocation' });
      permissionAlreadyGranted = perm.state === 'granted';
    } catch {
      // Permissions API não disponível no browser — trata como não concedido
    }

    if (permissionAlreadyGranted) {
      await doGeoAndSubmit(selected);
    } else {
      setState('show_location_modal');
    }
  };

  const handleModalConfirm = async () => {
    // Fecha o modal antes de pedir GPS para evitar sobreposição com dialog do browser
    setState('idle');
    if (selected) await doGeoAndSubmit(selected);
  };

  const isLoading = state === 'locating' || state === 'submitting';

  return (
    <>
      {state === 'show_location_modal' && (
        <LocationModal
          restaurantName={restaurantName}
          onConfirm={handleModalConfirm}
          onCancel={() => setState('idle')}
        />
      )}

      <div className="siis-form-section">
        <div className="siis-form-title">▸ ENVIAR RELATO</div>

        <div className="siis-status-grid">
          {REPORT_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => !isLoading && setSelected(opt.value)}
              disabled={isLoading}
              className={`siis-status-btn${selected === opt.value ? ' selected' : ''}`}
              style={
                selected === opt.value
                  ? { borderColor: opt.border, color: opt.color, background: opt.bg }
                  : {}
              }
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: opt.color,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              {opt.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="siis-error-bar">
            <span>⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected || isLoading}
          className="siis-submit-btn"
        >
          {state === 'locating'
            ? '◌ OBTENDO LOCALIZAÇÃO...'
            : state === 'submitting'
              ? 'ENVIANDO...'
              : 'ENVIAR RELATO'}
        </button>

        <div className="siis-geo-disclaimer">
          LOCALIZAÇÃO USADA APENAS PARA VALIDAR PROXIMIDADE
        </div>
      </div>
    </>
  );
}
