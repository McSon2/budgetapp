'use client';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { MonthSelector } from '@/components/dashboard/MonthSelector';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface DashboardHeaderProps {
  title: string;
  backLink?: string;
  backLabel?: string;
}

export function DashboardHeader({ title, backLink, backLabel = 'Retour' }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {title}
        </h1>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {backLink && (
            <Link href={backLink}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 mr-2 border-muted-foreground/20 bg-background/80 backdrop-blur-sm"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
          )}
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
