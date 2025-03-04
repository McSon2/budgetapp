'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowDownIcon, ArrowUpIcon, DashboardIcon } from '@radix-ui/react-icons';

interface BalanceCardProps {
  currentBalance?: number;
  endOfMonthBalance?: number;
  currency?: string;
}

export function BalanceCard({
  currentBalance: propCurrentBalance,
  endOfMonthBalance: propEndOfMonthBalance,
  currency = '€',
}: BalanceCardProps = {}) {
  // Utiliser les données du contexte ou les props si fournies
  const dashboardData = useDashboard();

  const currentBalance =
    propCurrentBalance !== undefined ? propCurrentBalance : dashboardData.currentBalance;

  const endOfMonthBalance =
    propEndOfMonthBalance !== undefined ? propEndOfMonthBalance : dashboardData.endOfMonthBalance;

  const isPositiveChange = endOfMonthBalance >= currentBalance;
  const changeAmount = Math.abs(endOfMonthBalance - currentBalance);
  const changePercentage =
    currentBalance !== 0 ? Math.round((changeAmount / Math.abs(currentBalance)) * 100) : 0;

  return (
    <Card className="h-full shadow-sm border-muted/60">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg sm:text-xl">Solde</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Situation financière actuelle et prévisionnelle
            </CardDescription>
          </div>
          <DashboardIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-1 sm:space-y-2">
            <div className="flex justify-between items-baseline">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Solde actuel</p>
              <p
                className={`text-xl sm:text-2xl font-bold ${currentBalance < 0 ? 'text-destructive' : 'text-primary'}`}
              >
                {currentBalance.toLocaleString('fr-FR')} {currency}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-1 sm:space-y-2">
            <div className="flex justify-between items-baseline">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                Solde fin de mois
              </p>
              <div className="flex flex-col items-end">
                <p
                  className={`text-xl sm:text-2xl font-bold ${endOfMonthBalance < 0 ? 'text-destructive' : 'text-primary'}`}
                >
                  {endOfMonthBalance.toLocaleString('fr-FR')} {currency}
                </p>
                <div
                  className={`flex items-center text-[10px] sm:text-xs ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}
                >
                  {isPositiveChange ? (
                    <ArrowUpIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                  )}
                  <span>
                    {changeAmount.toLocaleString('fr-FR')} {currency} ({changePercentage}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
