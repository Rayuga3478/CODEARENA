import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'default' | 'primary' | 'accent' | 'ok' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: boolean;
  hard?: boolean;
  pressed?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children?: ReactNode;
}

function classes({ variant = 'default', size = 'md', block, icon, hard, className = '' }: CommonProps) {
  return [
    'os-btn',
    variant !== 'default' && `os-btn--${variant}`,
    size !== 'md' && `os-btn--${size}`,
    block && 'os-btn--block',
    icon && 'os-btn--icon',
    hard && 'os-btn--hard',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, icon, hard, pressed, leading, trailing, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classes({ variant, size, block, icon, hard, className })}
      aria-pressed={pressed === undefined ? undefined : pressed}
      {...rest}
    >
      {leading}
      {children !== undefined && <span className="inline-flex items-center gap-2">{children}</span>}
      {trailing}
    </button>
  );
});

export function LinkButton({
  to,
  variant,
  size,
  block,
  icon,
  hard,
  leading,
  trailing,
  className,
  children,
  id,
}: CommonProps & { to: string; id?: string }) {
  return (
    <Link to={to} id={id} className={classes({ variant, size, block, icon, hard, className })}>
      {leading}
      {children !== undefined && <span className="inline-flex items-center gap-2">{children}</span>}
      {trailing}
    </Link>
  );
}
