'use client';

import { useEffect, useState } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

// Tracks the OS/browser color-scheme preference and exposes it as Excalidraw's theme
// union ('light' | 'dark'). The rest of the app already follows prefers-color-scheme
// automatically via CSS; this lets Excalidraw's own canvas/UI chrome (not styled by
// our Tailwind dark: classes) follow the same system-driven switching.
export function useSystemTheme(): 'light' | 'dark' {
  const [isDark, setIsDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDark ? 'dark' : 'light';
}
