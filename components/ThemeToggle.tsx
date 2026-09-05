'use client';

import { Sun, Moon } from 'lucide-react';
import { useState } from 'react';

function readStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem('ms_theme') as 'light' | 'dark') || 'light';
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(readStoredTheme);

  function setTheme(t: 'light' | 'dark') {
    setThemeState(t);
    localStorage.setItem('ms_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-bg3 p-1">
      <button
        onClick={() => setTheme('light')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          theme === 'light' ? 'bg-surface text-text shadow-sm' : 'text-text3'
        }`}
        aria-label="Light theme"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          theme === 'dark' ? 'bg-surface text-text shadow-sm' : 'text-text3'
        }`}
        aria-label="Dark theme"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
