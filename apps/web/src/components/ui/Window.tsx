import type { ReactNode, CSSProperties, HTMLAttributes } from 'react';
import { Minus, Square, X } from 'lucide-react';

type TitleTone = 'default' | 'gradient' | 'inactive' | 'gold' | 'silver' | 'bronze' | 'ok' | 'bad';

export interface WindowProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  icon?: ReactNode;
  /** Right side of the title bar. Defaults to decorative min/max/close controls. */
  controls?: ReactNode | false;
  onClose?: () => void;
  menubar?: ReactNode;
  statusbar?: ReactNode;
  tone?: TitleTone;
  elevated?: boolean;
  interactive?: boolean;
  /** Wrap children in a sunken white well. */
  well?: boolean;
  /** Remove body padding. */
  flush?: boolean;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
  as?: 'section' | 'article' | 'div' | 'aside';
  children?: ReactNode;
}

/** The core surface of the design system: a bevelled Win95-style window. */
export function Window({
  title,
  icon,
  controls,
  onClose,
  menubar,
  statusbar,
  tone = 'default',
  elevated = false,
  interactive = false,
  well = false,
  flush = false,
  className = '',
  bodyClassName = '',
  bodyStyle,
  as: Tag = 'section',
  children,
  ...rest
}: WindowProps) {
  const cls = ['os-window', elevated && 'os-window--elevated', interactive && 'os-window--interactive', className]
    .filter(Boolean)
    .join(' ');
  const titleCls = ['os-titlebar', tone !== 'default' && `os-titlebar--${tone}`].filter(Boolean).join(' ');

  return (
    <Tag className={cls} {...rest}>
      {title !== undefined && (
        <header className={titleCls}>
          <span className="os-titlebar__title">
            {icon}
            {typeof title === 'string' ? <span className="truncate">{title}</span> : title}
          </span>
          {controls !== false && (
            <span className="os-titlebar__controls">
              {controls ?? (
                <>
                  <span className="os-ctl" aria-hidden="true"><Minus strokeWidth={3} /></span>
                  <span className="os-ctl" aria-hidden="true"><Square strokeWidth={3} /></span>
                  {onClose ? (
                    <button type="button" className="os-ctl ml-0.5" onClick={onClose} aria-label="Close">
                      <X strokeWidth={3} />
                    </button>
                  ) : (
                    <span className="os-ctl ml-0.5" aria-hidden="true"><X strokeWidth={3} /></span>
                  )}
                </>
              )}
            </span>
          )}
        </header>
      )}
      {menubar && <nav className="os-menubar">{menubar}</nav>}
      <div className={`os-body ${flush ? 'os-body--flush' : ''} ${bodyClassName}`} style={bodyStyle}>
        {well ? <div className="os-well">{children}</div> : children}
      </div>
      {statusbar && <footer className="os-statusbar">{statusbar}</footer>}
    </Tag>
  );
}

export function Well({ className = '', inner = true, children, ...rest }: HTMLAttributes<HTMLDivElement> & { inner?: boolean }) {
  return (
    <div className={`os-well ${className}`} {...rest}>
      {inner ? <div className="os-well__inner">{children}</div> : children}
    </div>
  );
}

export function StatusCell({ children, fit = false }: { children: ReactNode; fit?: boolean }) {
  return <span className={`os-statusbar__cell ${fit ? 'os-statusbar__cell--fit' : ''}`}>{children}</span>;
}

export function GroupBox({ legend, children, className = '' }: { legend: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={`os-groupbox border-0 m-0 ${className}`}>
      <legend className="os-groupbox__legend">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`os-section-title ${className}`}>{children}</h2>;
}
