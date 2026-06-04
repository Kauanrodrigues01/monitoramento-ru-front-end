import { useRef } from 'react';
import { useFocusTrap } from '../lib/useFocusTrap';

type Props = {
  restaurantName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LocationModal({ restaurantName, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, { onEscape: onCancel });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="siis-modal-overlay"
    >
      <div className="siis-modal-backdrop" onClick={onCancel} aria-hidden="true" />
      <div ref={dialogRef} className="siis-modal-dialog">
        <div className="siis-modal-header">
          <div className="siis-modal-icon" aria-hidden="true">📍</div>
          <h3 id="location-modal-title" className="siis-modal-title">
            Verificação de localização
          </h3>
          <p className="siis-modal-subtitle">{restaurantName}</p>
        </div>
        <div className="siis-modal-body">
          <p className="siis-modal-text">
            Para confirmar que você está próximo ao restaurante e evitar relatos
            falsos, o sistema precisa verificar sua localização.{' '}
            <strong>Ela não é armazenada</strong>.
          </p>
          <div className="siis-modal-actions">
            <button type="button" onClick={onConfirm} className="siis-modal-confirm-btn">
              Entendido, compartilhar localização
            </button>
            <button type="button" onClick={onCancel} className="siis-modal-cancel-btn">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
