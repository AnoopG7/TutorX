/**
 * Navbar — Top navigation bar with logo, links, and theme toggle
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeContext } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/chat', label: 'Chat' },
  { href: '/progress', label: 'Progress' },
  { href: '/settings', label: 'Settings' },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useThemeContext();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-amber-500" />
            <span className="font-semibold text-lg hidden sm:inline">CBSE Study</span>
          </Link>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex md:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === link.href
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side - Theme + User + Logout */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {user && (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  {user.name}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Logout"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Mobile Menu Trigger */}
            <Button variant="ghost" size="icon" className="md:hidden" title="Menu">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
