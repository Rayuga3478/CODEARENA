import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Circle, Minus } from 'lucide-react';
import { getDifficulty, getTier, getVerdict, tierClass } from '@/lib/format';

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'purple' | 'muted' | 'default';

export function Badge({
  tone = 'default',
  flat = false,
  children,
  className = '',
  title,
}: {
  tone?: Tone;
  flat?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={['os-badge', tone !== 'default' && `os-badge--${tone}`, flat && 'os-badge--flat', className].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ rating, showLabel = true }: { rating: number; showLabel?: boolean }) {
  const d = getDifficulty(rating);
  return (
    <Badge tone={d.badge} flat title={`${d.label} · ${rating}`}>
      <span className="t-mono">{rating}</span>
      {showLabel && <span className="opacity-80">· {d.label}</span>}
    </Badge>
  );
}

export function VerdictBadge({ verdict, short = false }: { verdict: string; short?: boolean }) {
  const v = getVerdict(verdict);
  return (
    <Badge tone={v.tone} title={v.label}>
      {v.pending && <span className="os-hourglass" style={{ width: 8, height: 11 }} />}
      {short ? v.short : v.label}
    </Badge>
  );
}

/** Handle coloured by rating tier, linking to the profile. */
export function UserLink({ handle, rating, className = '' }: { handle: string; rating: number; className?: string }) {
  return (
    <Link
      to={`/user/${handle}`}
      className={`font-semibold ${tierClass(rating)} ${className}`}
      title={`${getTier(rating).title} · ${rating}`}
    >
      {handle}
    </Link>
  );
}

export function RatingBadge({ rating, showTitle = false }: { rating: number; showTitle?: boolean }) {
  const tier = getTier(rating);
  return (
    <span className={`t-mono font-bold ${tierClass(rating)}`} title={tier.title}>
      {rating}
      {showTitle && <span className="t-ui font-normal ml-2 text-[13px]">{tier.title}</span>}
    </span>
  );
}

export interface TagData {
  id?: string;
  name: string;
  color?: string;
}

export function Tag({
  tag,
  selected,
  onClick,
  count,
}: {
  tag: TagData;
  selected?: boolean;
  onClick?: () => void;
  count?: number;
}) {
  const content = (
    <>
      {tag.color && <span className="os-tag__swatch" style={{ background: tag.color }} />}
      {tag.name}
      {count !== undefined && <span className="opacity-60">{count}</span>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="os-tag" aria-pressed={!!selected} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <span className="os-tag">{content}</span>;
}

/** Solved / attempted / untouched indicator. */
export function StatusIcon({ status }: { status: 'SOLVED' | 'ATTEMPTED' | 'NONE' | null | undefined }) {
  if (status === 'SOLVED')
    return (
      <span title="Solved" className="inline-grid place-items-center w-5 h-5" style={{ background: 'var(--ok)', color: '#fff' }}>
        <Check size={13} strokeWidth={3} />
      </span>
    );
  if (status === 'ATTEMPTED')
    return (
      <span title="Attempted" className="inline-grid place-items-center w-5 h-5" style={{ background: 'var(--warn)', color: '#fff' }}>
        <Minus size={13} strokeWidth={3} />
      </span>
    );
  return (
    <span title="Not attempted" className="inline-grid place-items-center w-5 h-5" style={{ color: 'var(--text-3)' }}>
      <Circle size={10} />
    </span>
  );
}
