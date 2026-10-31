import { handleColor, splitMs, pad2 } from '@/lib/format';
import { useNow, useReveal } from '@/lib/hooks';
import { useEffect, useRef, type ReactNode } from 'react';

export function UserAvatar({
  handle,
  avatar,
  size = 32,
  className = '',
}: {
  handle: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`os-avatar ${className}`}
      style={{ width: size, height: size, background: handleColor(handle), fontSize: Math.round(size * 0.45) }}
      aria-hidden="true"
    >
      {avatar ? <img src={avatar} alt="" /> : handle.charAt(0)}
    </span>
  );
}

/**
 * LCD countdown to `target`. Calls `onComplete` once when reaching zero.
 */
export function Countdown({
  target,
  onComplete,
  size = 'md',
  className = '',
}: {
  target: string | Date;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const now = useNow(1000);
  const ms = new Date(target).getTime() - now;
  const fired = useRef(false);
  useEffect(() => {
    if (ms <= 0 && !fired.current) {
      fired.current = true;
      onComplete?.();
    }
  }, [ms, onComplete]);

  const { days, hours, minutes, seconds } = splitMs(ms);
  const fontSize = size === 'lg' ? 34 : size === 'sm' ? 15 : 22;
  return (
    <span className={`os-lcd ${className}`} style={{ fontSize }} role="timer" aria-label={`${days} days ${hours} hours ${minutes} minutes ${seconds} seconds`}>
      {days > 0 && (
        <>
          {days}
          <span className="os-lcd__unit">d</span>
        </>
      )}
      {pad2(hours)}
      <span className="os-lcd__unit">h</span>
      {pad2(minutes)}
      <span className="os-lcd__unit">m</span>
      {pad2(seconds)}
      <span className="os-lcd__unit" style={{ marginRight: 0 }}>s</span>
    </span>
  );
}

/** Live clock for the taskbar tray. */
export function Clock() {
  const now = useNow(15000);
  return (
    <time className="t-ui tabular-nums" dateTime={new Date(now).toISOString()}>
      {new Date(now).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}

/** Scroll-reveal wrapper. */
export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref as never} className={`reveal ${className}`} style={{ ['--reveal-delay' as string]: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
