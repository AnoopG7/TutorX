/**
 * useTheme Hook — Dark/light mode toggle with system preference
 */

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Load theme from localStorage
    const stored = localStorage.getItem('tutorx-theme') as Theme | null;
    if (stored) {
      setTheme(stored);
    } else {
      setTheme('system');
    }
  }, []);

  useEffect(() => {
    // Resolve theme based on system preference
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setResolvedTheme(isDark ? 'dark' : 'light');

    // Apply to document
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('tutorx-theme', newTheme);
  };

  return {
    theme,
    resolvedTheme,
    toggleTheme,
  };
}
