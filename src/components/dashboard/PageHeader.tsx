'use client';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  backLink?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  backLink,
  backLabel = 'Retour au tableau de bord',
}: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
        {title}
      </h1>
      <div className="flex items-center gap-2">
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
        <ThemeToggle />
      </div>
    </div>
  );
}
