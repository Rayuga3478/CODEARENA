import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Window } from '@/components/ui';

export function Container({ children, className = '', wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={`container-os ${className}`} style={wide ? { maxWidth: 1600 } : undefined}>
      {children}
    </div>
  );
}

/** Page heading rendered on the desktop (white text on teal). */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-6 window-open">
      <div className="min-w-0">
        {eyebrow && <p className="t-eyebrow m-0 mb-2" style={{ color: 'var(--accent)' }}>{eyebrow}</p>}
        <h1 className="t-display on-desk m-0 text-[clamp(34px,6vw,56px)]" style={{ textShadow: '3px 3px 0 rgba(0,0,0,.35)' }}>
          {title}
        </h1>
        {description && <p className="on-desk opacity-85 m-0 mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="container-os pb-8 md:pb-10">
      <Window title="About CodeArena" controls={false} as="div">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr] p-2">
          <div>
            <p className="t-display text-[28px] m-0">
              Code<span style={{ color: 'var(--accent-ink)' }}>Arena</span>
            </p>
            <p className="text-[14px] t-secondary mt-2 mb-0 max-w-sm">
              A competitive programming platform with a real judge, live contests and honest rankings. Built for people who like their verdicts fast.
            </p>
          </div>
          <FooterCol title="Practice" links={[['Problems', '/problems'], ['Submissions', '/submissions'], ['Discuss', '/discuss']]} />
          <FooterCol title="Compete" links={[['Contests', '/contests'], ['Rankings', '/rankings']]} />
          <FooterCol title="Account" links={[['Log in', '/login'], ['Sign up', '/register'], ['Reset password', '/forgot-password']]} />
        </div>
        <div className="os-statusbar mt-3">
          <span className="os-statusbar__cell">© {year} CodeArena</span>
          <span className="os-statusbar__cell os-statusbar__cell--fit hidden sm:block">Judge: C++17 · Python 3</span>
          <span className="os-statusbar__cell os-statusbar__cell--fit">Alt+S — Start menu</span>
        </div>
      </Window>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="t-eyebrow m-0 mb-3">{title}</p>
      <ul className="list-none m-0 p-0 flex flex-col gap-2">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link to={to} className="text-[14px]">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
