'use client';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        <SignOutButton variant="icon" />
        <ThemeToggle />
      </div>
    </div>
  );
}
