import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Window } from './Window';

/** Dialog box: modal window with dithered overlay, focus trap-lite and Escape to close. */
export function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      ref.current?.querySelector<HTMLElement>('input, textarea, select, button:not([aria-label="Close"])')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="os-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="os-dialog" style={{ width: `min(${width}px, 100%)` }}>
        <Window title={title} icon={icon} onClose={onClose} elevated controls={undefined}>
          {children}
          {footer && <div className="flex flex-wrap justify-end gap-2 mt-4">{footer}</div>}
        </Window>
      </div>
    </div>,
    document.body,
  );
}
