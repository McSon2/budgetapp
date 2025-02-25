'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>
        Clair
      </Button>
      <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>
        Sombre
      </Button>
      <Button
        variant={theme === 'system' ? 'default' : 'outline'}
        onClick={() => setTheme('system')}
      >
        Système
      </Button>
    </div>
  );
}
