'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Upload } from 'lucide-react';
import Link from 'next/link';
import { AddExpensePopover } from './AddExpensePopover';

export function ActionButtons() {
  return (
    <Card className="shadow-sm border-muted/60">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <AddExpensePopover />
          </div>
          <div className="flex-1">
            <Link href="/dashboard/import" className="w-full">
              <Button variant="outline" className="w-full border-muted-foreground/20" size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Importer CSV
              </Button>
            </Link>
          </div>
          <div className="flex-1">
            <Link href="/dashboard/export" className="w-full">
              <Button variant="outline" className="w-full border-muted-foreground/20" size="lg">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
