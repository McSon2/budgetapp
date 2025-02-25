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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="flex items-center gap-2">
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
