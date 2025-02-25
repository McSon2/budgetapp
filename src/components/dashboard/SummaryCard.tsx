'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SummaryCardProps {
  income?: number;
  expenses?: number;
  currency?: string;
}

export function SummaryCard({
  income: propIncome,
  expenses: propExpenses,
  currency = '€',
}: SummaryCardProps = {}) {
  // Utiliser les données du contexte ou les props si fournies
  const dashboardData = useDashboard();

  const income = propIncome !== undefined ? propIncome : dashboardData.income;
  const expenses = propExpenses !== undefined ? propExpenses : dashboardData.expenses;

  // Formater le mois pour l'affichage
  const formattedMonth = format(dashboardData.selectedMonth, 'MMMM yyyy', { locale: fr });

  const total = income - expenses;
  const percentage = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Récapitulatif</CardTitle>
        <CardDescription>Entrées et sorties de {formattedMonth}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Entrées</span>
              <span className="text-sm font-medium text-green-500">
                +{income.toLocaleString('fr-FR')} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Sorties</span>
              <span className="text-sm font-medium text-red-500">
                -{expenses.toLocaleString('fr-FR')} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total</span>
              <span
                className={`text-sm font-bold ${total < 0 ? 'text-destructive' : 'text-primary'}`}
              >
                {total.toLocaleString('fr-FR')} {currency}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Dépenses</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
