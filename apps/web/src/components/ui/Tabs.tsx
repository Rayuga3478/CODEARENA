import { useId, type ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

/** Win95 property-sheet tabs. Renders the tab strip + a raised panel. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  children,
  panelClassName = '',
  className = '',
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  children?: ReactNode;
  panelClassName?: string;
  className?: string;
}) {
  const uid = useId();
  return (
    <div className={className}>
      <div className="os-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`${uid}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={t.id === value}
            aria-controls={`${uid}-panel`}
            className="os-tab"
            onClick={() => onChange(t.id)}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && <span className="os-tab__count">{t.count}</span>}
          </button>
        ))}
      </div>
      {children !== undefined && (
        <div id={`${uid}-panel`} role="tabpanel" className={`os-tabpanel ${panelClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
