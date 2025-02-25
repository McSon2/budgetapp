'use client';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  backLink?: string;
  backLabel?: string;
}

export function PageHeader({ title, backLink, backLabel = 'Back to Dashboard' }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {backLink && (
          <Link href={backLink}>
            <Button variant="outline">{backLabel}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
