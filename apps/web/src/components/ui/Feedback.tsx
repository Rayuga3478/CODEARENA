import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export function ProgressBar({ value, label }: { value?: number; label?: string }) {
  const indeterminate = value === undefined;
  return (
    <div
      className={`os-progress ${indeterminate ? 'os-progress--indeterminate' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="os-progress__bar" style={{ width: `${indeterminate ? 40 : Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/** Centered loading state with a Win-style progress bar. */
export function Loading({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}>
      <div className="w-56 max-w-full">
        <ProgressBar label={label} />
      </div>
      <span className="t-ui t-secondary text-[13px]">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`os-skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-4" style={{ flex: c === 1 ? 3 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="os-empty">
      {icon}
      <p className="t-ui text-[16px] m-0" style={{ color: 'var(--text)' }}>{title}</p>
      {description && <p className="text-[14px] m-0 max-w-md">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const ALERT_ICONS = { bad: XCircle, ok: CheckCircle2, info: Info, warn: AlertTriangle };

export function Alert({ tone = 'info', children, className = '' }: { tone?: 'bad' | 'ok' | 'info' | 'warn'; children: ReactNode; className?: string }) {
  const Icon = ALERT_ICONS[tone];
  return (
    <div className={`os-alert os-alert--${tone} ${className}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <Icon size={18} className="flex-none mt-[1px]" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
