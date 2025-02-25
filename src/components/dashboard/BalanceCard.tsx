'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon } from '@radix-ui/react-icons';

interface BalanceCardProps {
  currentBalance: number;
  endOfMonthBalance: number;
  currency?: string;
}

export function BalanceCard({
  currentBalance,
  endOfMonthBalance,
  currency = '€',
}: BalanceCardProps) {
  const isPositiveChange = endOfMonthBalance >= currentBalance;
  const changeAmount = Math.abs(endOfMonthBalance - currentBalance);
  const changePercentage =
    currentBalance !== 0 ? Math.round((changeAmount / Math.abs(currentBalance)) * 100) : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Solde</CardTitle>
        <CardDescription>Situation financière actuelle et prévisionnelle</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Solde actuel</p>
            <p
              className={`text-2xl font-bold ${currentBalance < 0 ? 'text-destructive' : 'text-primary'}`}
            >
              {currentBalance.toLocaleString('fr-FR')} {currency}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Solde fin de mois</p>
            <div className="flex items-center gap-2">
              <p
                className={`text-2xl font-bold ${endOfMonthBalance < 0 ? 'text-destructive' : 'text-primary'}`}
              >
                {endOfMonthBalance.toLocaleString('fr-FR')} {currency}
              </p>
              <div
                className={`flex items-center text-xs ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}
              >
                {isPositiveChange ? (
                  <ArrowUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 mr-1" />
                )}
                <span>
                  {changeAmount.toLocaleString('fr-FR')} {currency} ({changePercentage}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
