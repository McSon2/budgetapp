'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, startOfMonth } from 'date-fns';
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
    // Déterminer le mois actuel pour filtrer les dépenses récurrentes
    // S'assurer que selectedMonth est bien un objet Date
    const selectedMonth = new Date(dashboardData.selectedMonth);
    const startOfSelectedMonth = startOfMonth(selectedMonth);

    // Solution généraliste pour filtrer correctement les dépenses récurrentes

    // 1. Obtenir le mois et l'année actuels
    const currentMonth = selectedMonth.getMonth();
    const currentYear = selectedMonth.getFullYear();

    // Nous n'avons pas accès aux transactions directement via dashboardData
    // Nous allons donc utiliser une logique basée sur les dates pour éviter les doublons

    // Filtrer les dépenses récurrentes valides pour ce mois
    const validRecurringExpenses = dashboardData.recurringExpenses.filter(expense => {
      // Pour être valide, l'expense doit:
      // 1. Être négative (une dépense, pas un revenu)
      const isNegative = expense.amount < 0;

      // 2. Soit ne pas avoir de date de fin, soit avoir une date de fin après le début du mois
      const hasEndDate = expense.endDate !== null;
      const endDateAfterMonthStart = hasEndDate
        ? new Date(expense.endDate!) > startOfSelectedMonth
        : true;

      // 3. Date de début
      const nextDate = new Date(expense.nextDate);
      const nextDateMonth = nextDate.getMonth();
      const nextDateYear = nextDate.getFullYear();

      // 4. Vérifier si la dépense doit être générée pour ce mois en fonction de sa fréquence
      let shouldBeGenerated = false;

      if (expense.frequency === 'yearly') {
        // Pour une dépense annuelle: elle n'est générée que si son mois de paiement correspond au mois actuel
        // Par exemple: Amazon Prime prélevé en février ne doit pas apparaître en mars
        shouldBeGenerated = nextDateMonth === currentMonth && nextDateYear === currentYear;
      } else if (expense.frequency === 'monthly') {
        // Pour une dépense mensuelle: nous devons vérifier si elle doit être générée ce mois-ci

        // Règle 1: Si nextDate est dans le mois actuel, la dépense est déjà incluse dans
        // les dépenses régulières, donc on ne l'ajoute pas comme récurrente
        const isInCurrentMonth = nextDateMonth === currentMonth && nextDateYear === currentYear;

        // Règle 2: Si nextDate est avant le mois actuel, la dépense doit être générée
        // car nous sommes après sa date de prochaine occurrence
        const isBeforeCurrentMonth =
          nextDateYear < currentYear ||
          (nextDateYear === currentYear && nextDateMonth < currentMonth);

        shouldBeGenerated = isBeforeCurrentMonth && !isInCurrentMonth;
      } else {
        // Pour d'autres fréquences, utiliser une logique similaire aux mensuelles
        const isInCurrentMonth = nextDateMonth === currentMonth && nextDateYear === currentYear;

        const isBeforeCurrentMonth =
          nextDateYear < currentYear ||
          (nextDateYear === currentYear && nextDateMonth < currentMonth);

        shouldBeGenerated = isBeforeCurrentMonth && !isInCurrentMonth;
      }

      // Finalement, une dépense n'est valide que si:
      // - elle est négative
      // - sa date de fin est après le début du mois (ou pas de date de fin)
      // - elle doit être générée ce mois-ci selon sa fréquence
      const isValid = isNegative && endDateAfterMonthStart && shouldBeGenerated;

      return isValid;
    });

    // Calculer le montant total des dépenses récurrentes valides
    validRecurringExpenses.forEach(expense => {
      recurringExpensesAmount += Number(expense.amount);
    });
  }

  // Calculer le total des dépenses (régulières + récurrentes)
  const totalExpenses = Number((regularExpenses + recurringExpensesAmount).toFixed(2));

  // Rendre les valeurs positives pour l'affichage dans le composant
  const positiveIncome = income !== undefined ? Math.abs(income) : 0;
  const positiveExpenses = Math.abs(totalExpenses);
  const total = Number((income + totalExpenses).toFixed(2));

  // Formater le mois pour l'affichage
  const formattedMonth = format(dashboardData.selectedMonth, 'MMMM yyyy', { locale: fr });

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
