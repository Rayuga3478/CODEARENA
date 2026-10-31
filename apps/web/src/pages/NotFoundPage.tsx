import { useNavigate, useLocation } from 'react-router-dom';
import { useDocumentTitle, useHotkey } from '@/lib/hooks';

/** BSOD-style 404. Press any key (or click) to go home. */
export function NotFoundPage() {
  useDocumentTitle('Page not found');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useHotkey((e) => !e.altKey && !e.ctrlKey && !e.metaKey && (e.key.length === 1 || e.key === 'Enter' || e.key === 'Escape'), () => navigate('/'));

  return (
    <div className="container-os">
      <section
        role="alert"
        onClick={() => navigate('/')}
        className="mx-auto max-w-3xl px-6 py-12 sm:px-12 sm:py-16 cursor-pointer window-open"
        style={{ background: '#0000aa', color: '#fff', fontFamily: 'var(--font-mono)', boxShadow: 'var(--shadow-hard)' }}
      >
        <p className="text-center m-0 mb-8">
          <span className="px-2" style={{ background: '#aaa', color: '#0000aa', fontWeight: 700 }}>CodeArena</span>
        </p>
        <h1 className="m-0 mb-6 text-[18px] sm:text-[20px] font-normal leading-relaxed">
          A fatal exception 404 has occurred at <span className="break-all">{pathname}</span>. The page you requested could not be found.
        </h1>
        <ul className="m-0 mb-8 pl-5 leading-relaxed text-[16px]">
          <li>Press any key to return to the desktop.</li>
          <li>Check the address for typos, or use the Start menu to navigate.</li>
        </ul>
        <p className="text-center m-0">
          Press any key to continue <span className="caret" aria-hidden="true" />
        </p>
      </section>
    </div>
  );
}
