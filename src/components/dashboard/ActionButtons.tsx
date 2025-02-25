'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload } from 'lucide-react';
import Link from 'next/link';
import { AddExpensePopover } from './AddExpensePopover';

export function ActionButtons() {
  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <AddExpensePopover />
            </div>
            <div className="flex-1">
              <Link href="/dashboard/import" className="w-full">
                <Button variant="outline" className="w-full" size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  Importer CSV
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
