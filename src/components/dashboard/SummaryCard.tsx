'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Récupérer les données du dashboard
  const income = propIncome !== undefined ? propIncome : dashboardData.income;

  // Calculer le montant total des dépenses, incluant les récurrentes
  // Nous devons calculer cela ici puisque le dashboard service n'inclut pas les dépenses récurrentes
  // dans la propriété 'expenses'

  // 1. Les dépenses normales déjà dans le dashboard
  const regularExpenses = propExpenses !== undefined ? propExpenses : dashboardData.expenses;

  // 2. Calculer les dépenses récurrentes pour le mois actuel
  let recurringExpensesAmount = 0;

  // Si des dépenses récurrentes sont disponibles, les inclure dans le total
  if (dashboardData.recurringExpenses && dashboardData.recurringExpenses.length > 0) {
    // Nous considérons uniquement les montants négatifs des dépenses récurrentes
    recurringExpensesAmount = dashboardData.recurringExpenses
      .filter(expense => expense.amount < 0)
      .reduce((total, expense) => total + expense.amount, 0);
  }

  // Le total des dépenses inclut les régulières et les récurrentes
  const totalExpenses = regularExpenses + recurringExpensesAmount;

  // Formater le mois pour l'affichage
  const formattedMonth = format(dashboardData.selectedMonth, 'MMMM yyyy', { locale: fr });

  // S'assurer que les valeurs sont positives pour l'affichage
  const positiveIncome = Math.abs(income);
  const positiveExpenses = Math.abs(totalExpenses);

  // Le total représente la somme des entrées et sorties
  const total = income + totalExpenses;

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
                +{positiveIncome.toLocaleString('fr-FR')} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-muted-foreground">Sorties</span>
              <span className="text-sm font-medium text-red-500">
                -{positiveExpenses.toLocaleString('fr-FR')} {currency}
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
        </div>
      </CardContent>
    </Card>
  );
}
