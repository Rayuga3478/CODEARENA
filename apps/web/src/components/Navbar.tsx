import { useCallback, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Code2,
  Trophy,
  BarChart3,
  MessagesSquare,
  User,
  LogIn,
  LogOut,
  UserPlus,
  Moon,
  Sun,
  Home,
  ListChecks,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useDismiss, useHotkey } from '@/lib/hooks';
import { Clock, LogoMark, UserAvatar } from '@/components/ui';
import { tierClass } from '@/lib/format';

const NAV = [
  { to: '/problems', label: 'Problems', icon: Code2, key: 'P' },
  { to: '/contests', label: 'Contests', icon: Trophy, key: 'C' },
  { to: '/rankings', label: 'Rankings', icon: BarChart3, key: 'R' },
  { to: '/discuss', label: 'Discuss', icon: MessagesSquare, key: 'D' },
] as const;

/**
 * Taskbar navigation. Desktop: fixed top bar. Mobile: fixed bottom taskbar.
 * The Start button opens a Start menu containing every destination.
 */
export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(menuRef, open, close);

  // Ctrl/Cmd + K or "/" focuses search on the problems page; Alt+S toggles Start
  useHotkey((e) => e.altKey && e.key.toLowerCase() === 's', (e) => { e.preventDefault(); setOpen((o) => !o); });

  async function handleLogout() {
    close();
    await logout();
    navigate('/');
  }

  const go = (to: string) => {
    close();
    navigate(to);
  };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <div ref={menuRef}>
      <nav className="os-taskbar" aria-label="Main">
        <button
          type="button"
          className="os-btn os-start"
          aria-pressed={open}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          id="start-button"
          title="Start (Alt+S)"
        >
          <LogoMark className="os-start__logo" />
          <span>Start</span>
        </button>

        <Link to="/" className="hidden md:flex items-center gap-2 px-2 no-underline hover:no-underline" style={{ color: 'var(--text)' }} id="nav-home">
          <span className="t-display text-[20px] tracking-[0.12em]">
            Code<span style={{ color: 'var(--accent-ink)' }}>Arena</span>
          </span>
        </Link>

        <span className="os-taskbar__sep hidden md:block" />

        <div className="os-taskbar__tasks">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              id={`nav-${label.toLowerCase()}`}
              className="os-btn os-task"
              aria-pressed={isActive(to)}
              aria-label={label}
              title={label}
            >
              <Icon />
              <span className="hidden md:inline truncate">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="os-tray">
          <button type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'Classic' : 'Midnight'} theme`} title="Toggle theme" id="theme-toggle">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {isAuthenticated && user ? (
            <Link to={`/user/${user.handle}`} className="hidden sm:flex items-center gap-2 no-underline hover:no-underline" title="Your profile" id="tray-profile">
              <UserAvatar handle={user.handle} avatar={user.avatar} size={22} />
              <span className={`t-ui text-[13px] font-semibold ${tierClass(user.rating)} hidden lg:inline`}>{user.handle}</span>
            </Link>
          ) : (
            <Link to="/login" className="hidden sm:inline t-ui text-[13px]" id="tray-login">
              Log in
            </Link>
          )}
          <span className="hidden sm:inline"><Clock /></span>
        </div>
      </nav>

      {open && (
        <div className="os-menu os-startmenu" role="menu" aria-label="Start menu">
          <div className="os-startmenu__brand" aria-hidden="true">
            <span>
              Code<b>Arena</b>
            </span>
          </div>
          <div className="os-startmenu__items">
            {isAuthenticated && user && (
              <div className="flex items-center gap-3 px-2 py-3 mb-1 os-well">
                <UserAvatar handle={user.handle} avatar={user.avatar} size={36} />
                <div className="min-w-0">
                  <div className={`t-ui font-semibold truncate ${tierClass(user.rating)}`}>{user.handle}</div>
                  <div className="text-[12px] t-muted t-mono">Rating {user.rating}</div>
                </div>
              </div>
            )}
            <MenuItem icon={Home} label="Home" onClick={() => go('/')} active={location.pathname === '/'} />
            {NAV.map(({ to, label, icon, key }) => (
              <MenuItem key={to} icon={icon} label={label} mnemonic={key} onClick={() => go(to)} active={isActive(to)} />
            ))}
            <MenuItem icon={ListChecks} label="Submissions" onClick={() => go('/submissions')} active={isActive('/submissions')} />
            <div className="os-menu__sep" />
            {isAuthenticated && user ? (
              <>
                <MenuItem icon={User} label="My Profile" onClick={() => go(`/user/${user.handle}`)} />
                <MenuItem icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Classic theme' : 'Midnight theme'} onClick={toggleTheme} />
                <div className="os-menu__sep" />
                <MenuItem icon={LogOut} label="Log Off…" onClick={handleLogout} id="menu-logout" />
              </>
            ) : (
              <>
                <MenuItem icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? 'Classic theme' : 'Midnight theme'} onClick={toggleTheme} />
                <div className="os-menu__sep" />
                <MenuItem icon={LogIn} label="Log In…" onClick={() => go('/login')} id="menu-login" />
                <MenuItem icon={UserPlus} label="Sign Up" onClick={() => go('/register')} id="menu-register" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  active,
  mnemonic,
  id,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  mnemonic?: string;
  id?: string;
}) {
  const i = mnemonic ? label.indexOf(mnemonic) : -1;
  return (
    <button type="button" role="menuitem" className="os-menu__item" aria-current={active ? 'page' : undefined} onClick={onClick} id={id}>
      <Icon size={18} />
      <span>
        {i >= 0 ? (
          <>
            {label.slice(0, i)}
            <span className="mnemonic">{label[i]}</span>
            {label.slice(i + 1)}
          </>
        ) : (
          label
        )}
      </span>
    </button>
  );
}
