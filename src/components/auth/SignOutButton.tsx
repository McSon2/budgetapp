'use client';

import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        signOut({ callbackUrl: '/' });
      }}
    >
      <Button type="submit" variant="destructive" className="w-full">
        Sign Out
      </Button>
    </form>
  );
}
