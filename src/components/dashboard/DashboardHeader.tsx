'use client';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DashboardHeaderProps {
  title: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {title}
        </h1>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <SignOutButton variant="icon" />
          <ThemeToggle />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <MonthSelector />
      </div>
    </div>
  );
}
