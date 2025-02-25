'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface SignOutButtonProps {
  variant?: 'default' | 'icon';
}

export function SignOutButton({ variant = 'default' }: SignOutButtonProps) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        signOut({ callbackUrl: '/' });
      }}
    >
      {variant === 'default' ? (
        <Button type="submit" variant="destructive" className="w-full">
          Sign Out
        </Button>
      ) : (
        <Button type="submit" variant="outline" size="icon" title="Déconnexion">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Déconnexion</span>
        </Button>
      )}
    </form>
  );
}
