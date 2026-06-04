import { type RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside a modal/dialog element.
 * Cycles Tab/Shift+Tab among focusable children and calls onEscape on Escape key.
 * Pass autoFocus=false when the element already manages its own initial focus (e.g. via autoFocus attr).
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  {
    onEscape,
    autoFocus = true,
  }: { onEscape?: () => void; autoFocus?: boolean } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (autoFocus) first?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onEscape?.(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [ref, onEscape, autoFocus]);
}
