import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '@/db/db';
import type { Theme } from '@/domain/types';

const THEME_COLOR = { dark: '#0b0b0b', light: '#e6e6e6' } as const;

function apply(mode: 'dark' | 'light') {
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[mode]);
}

/** Aplica o tema das configurações no <html>; "sistema" acompanha o aparelho ao vivo. */
export function ThemeSync() {
  const theme: Theme =
    useLiveQuery(async () => (await db.settings.get('singleton'))?.theme) ?? 'dark';

  useEffect(() => {
    if (theme !== 'system') {
      apply(theme);
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const update = () => {
      apply(media.matches ? 'light' : 'dark');
    };
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
    };
  }, [theme]);

  return null;
}
