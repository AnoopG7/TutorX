/**
 * useTheme Hook — Dark/light mode toggle with system preference
 */

import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem('tutorx-theme') as Theme) || 'system';
}

function readResolvedTheme(): 'light' | 'dark' {
  const stored = getStoredTheme();
  if (stored === 'dark') return 'dark';
  if (stored === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDarkClass() {
  const isDark = readResolvedTheme() === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(readResolvedTheme);

  useEffect(() => {
    applyDarkClass();
  }, [resolvedTheme]);

  const toggleTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('tutorx-theme', newTheme);
    setResolvedTheme(
      newTheme === 'dark' ? 'dark'
        : newTheme === 'light' ? 'light'
        : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );
  }, []);

  return {
    theme,
    resolvedTheme,
    toggleTheme,
  };
}