import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="siis-toast-wrap" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          onClick={() => dismiss(toast.id)}
          className={`siis-toast ${toast.type}`}
        >
          <span>{toast.type === 'success' ? '✓' : toast.type === 'info' ? 'ℹ' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
