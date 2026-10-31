import type { ReactNode } from 'react';
import { KeyRound } from 'lucide-react';
import { Window } from '@/components/ui';
import { LogoMark } from '@/components/ui';

/** Classic "log on" dialog used by every auth page. */
export function AuthWindow({
  title,
  heading,
  subheading,
  children,
  footer,
}: {
  title: string;
  heading: string;
  subheading?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container-os flex justify-center py-6 sm:py-12">
      <Window title={title} icon={<KeyRound size={14} />} elevated className="w-full max-w-[460px] window-open">
        <div className="grid grid-cols-[auto_1fr] gap-4 items-start p-1 sm:p-3">
          <span className="hidden sm:grid place-items-center w-14 h-14 bevel-out" style={{ background: 'var(--chrome)' }}>
            <LogoMark width={36} height={36} />
          </span>
          <div className="col-span-2 sm:col-span-1 min-w-0">
            <h1 className="t-h3 text-[22px] m-0">{heading}</h1>
            {subheading && <p className="t-secondary text-[14px] mt-1 mb-0">{subheading}</p>}
          </div>
        </div>
        <div className="os-divider" />
        <div className="p-1 sm:p-3">{children}</div>
        {footer && (
          <>
            <div className="os-divider" />
            <div className="px-1 sm:px-3 pb-1 text-[14px] t-secondary">{footer}</div>
          </>
        )}
      </Window>
    </div>
  );
}
