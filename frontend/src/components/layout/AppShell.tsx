/**
 * AppShell — sidebar + content for signed-in pages.
 * Height chain: h-dvh shell → main (min-h-0) → page decides its own scrolling.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, LogOut, Menu, Moon, PenLine, Settings, Sun, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { BackendStartupBanner } from '@/components/BackendStartupBanner';
import { useAuth } from '@/providers/AuthProvider';
import { useSessions } from '@/providers/SessionsProvider';
import { useThemeContext } from '@/providers/ThemeProvider';
import { TIME_GROUPS, timeGroup } from '@/lib/dates';
import { getSubject } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer on navigation. This mirrors external state
  // (the URL) into local UI state, which is what an effect is for.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col border-r border-border bg-sidebar shadow-xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3.5 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <BackendStartupBanner />
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <Link
            to="/chat"
            className="ml-auto rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="New question"
          >
            <PenLine className="h-5 w-5" />
          </Link>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent() {
  const { sessions, loading, error } = useSessions();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useThemeContext();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const activeSession = location.pathname === '/chat' ? params.get('session') : null;

  const grouped = TIME_GROUPS.map((group) => ({
    group,
    items: sessions.filter((s) => timeGroup(s.created_at) === group),
  })).filter((g) => g.items.length > 0);

  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    );

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-4">
        <Logo />
      </div>

      <div className="px-3">
        <button
          onClick={() => navigate('/chat')}
          className="flex w-full items-center gap-3 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <PenLine className="h-4 w-4" />
          New question
        </button>
        <nav className="mt-3 space-y-0.5" aria-label="Main">
          <NavLink to="/" end className={navItem}>
            <Home className="h-4 w-4" />
            Home
          </NavLink>
          <NavLink to="/settings" className={navItem}>
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </nav>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Past questions">
        <h2 className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">Your questions</h2>
        {loading ? (
          <div className="space-y-1.5 px-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : error ? (
          <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Couldn’t load your history. It will appear once the server responds.
          </p>
        ) : grouped.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Questions you ask will be saved here.
          </p>
        ) : (
          grouped.map(({ group, items }) => (
            <div key={group} className="mb-3">
              <h3 className="px-3 pb-1 pt-2 text-[0.7rem] font-medium text-muted-foreground/80">{group}</h3>
              <ul className="space-y-px">
                {items.map((s) => {
                  const subject = getSubject(s.subject);
                  const active = s.id === activeSession;
                  return (
                    <li key={s.id}>
                      <Link
                        to={`/chat?session=${s.id}`}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                          active ? 'bg-card text-foreground shadow-sm' : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                        )}
                        title={s.title || 'Untitled question'}
                      >
                        {subject && (
                          <subject.icon className={cn('h-3.5 w-3.5 shrink-0', subject.ink)} aria-label={subject.label} />
                        )}
                        <span className="truncate">{s.title || 'Untitled question'}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-sm font-semibold text-accent-foreground">
            {user?.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name || 'Student'}</p>
          </div>
          <button
            onClick={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/home');
            }}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
