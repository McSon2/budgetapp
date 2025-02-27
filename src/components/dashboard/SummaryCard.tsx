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
  const expenses = propExpenses !== undefined ? propExpenses : dashboardData.expenses;
  const currentBalance = dashboardData.currentBalance;
  const endOfMonthBalance = dashboardData.endOfMonthBalance;

  // Formater le mois pour l'affichage
  const formattedMonth = format(dashboardData.selectedMonth, 'MMMM yyyy', { locale: fr });

  // Calculer les entrées et sorties en tenant compte des dépenses récurrentes
  // Si les entrées et sorties du dashboard sont à zéro, calculer à partir de la différence
  // entre le solde actuel et le solde de fin de mois
  let calculatedIncome = income;
  let calculatedExpenses = expenses;

  // Si les entrées et sorties sont à zéro ou très faibles, mais qu'il y a une différence
  // significative entre le solde actuel et le solde de fin de mois, recalculer
  if (
    Math.abs(income) < 1 &&
    Math.abs(expenses) < 1 &&
    Math.abs(endOfMonthBalance - currentBalance) > 10
  ) {
    // La différence entre le solde actuel et le solde de fin de mois
    const difference = endOfMonthBalance - currentBalance;

    // Si la différence est positive, c'est un revenu, sinon c'est une dépense
    if (difference > 0) {
      calculatedIncome = difference;
      calculatedExpenses = 0;
    } else {
      calculatedIncome = 0;
      calculatedExpenses = difference; // Déjà négatif
    }

    console.log(
      `[DEBUG SUMMARY] Recalcul des entrées/sorties à partir de la différence: ${difference}`
    );
    console.log(`[DEBUG SUMMARY] Entrées recalculées: ${calculatedIncome}`);
    console.log(`[DEBUG SUMMARY] Sorties recalculées: ${calculatedExpenses}`);
  }

  // S'assurer que les valeurs sont positives pour l'affichage
  const positiveIncome = Math.abs(calculatedIncome);
  const positiveExpenses = Math.abs(calculatedExpenses);

  // Le total est la somme des entrées et des sorties (les sorties sont déjà négatives)
  // Si nous avons recalculé les valeurs, le total devrait être égal à la différence
  // entre le solde de fin de mois et le solde actuel
  const total = endOfMonthBalance - currentBalance;

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
