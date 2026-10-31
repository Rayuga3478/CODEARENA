import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useDismiss } from '@/lib/hooks';

export interface DropdownItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  separator?: boolean;
  active?: boolean;
}

/** Menu dropdown anchored to a trigger. */
export function Dropdown({
  trigger,
  items,
  align = 'left',
  className = '',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className="os-menu"
          style={{ top: 'calc(100% + 2px)', [align]: 0, transformOrigin: align === 'right' ? 'top right' : 'top left' }}
        >
          {items.map((it) =>
            it.separator ? (
              <div key={it.key} className="os-menu__sep" />
            ) : (
              <button
                key={it.key}
                role="menuitem"
                type="button"
                className="os-menu__item"
                aria-current={it.active ? 'page' : undefined}
                onClick={() => {
                  setOpen(false);
                  it.onSelect?.();
                }}
              >
                {it.icon}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
