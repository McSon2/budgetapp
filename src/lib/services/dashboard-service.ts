import { prisma } from '@/lib/prisma';
import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, isSameDay } from 'date-fns';

export interface DashboardData {
  currentBalance: number;
  endOfMonthBalance: number;
  income: number;
  expenses: number;
  recurringExpenses: {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    nextDate: Date;
  }[];
  categoryExpenses: {
    id: string;
    name: string;
    amount: number;
    color: string;
  }[];
  selectedMonth: Date;
}

// Fonction utilitaire pour normaliser une date au début du mois en UTC
const normalizeToStartOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  normalized.setUTCDate(1);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

// Fonction utilitaire pour normaliser une date à la fin du mois en UTC
const normalizeToEndOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  const lastDay = new Date(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth() + 1,
    0
  ).getUTCDate();
  normalized.setUTCDate(lastDay);
  normalized.setUTCHours(23, 59, 59, 999);
  return normalized;
};

export async function getDashboardData(
  userId: string,
  selectedDate?: Date | string
): Promise<DashboardData> {
  // Normaliser la date sélectionnée au début du mois en UTC
  const normalizedDate = selectedDate
    ? normalizeToStartOfMonth(selectedDate)
    : normalizeToStartOfMonth(new Date());

  // Calculer le début et la fin du mois sélectionné en UTC
  const startDate = normalizeToStartOfMonth(normalizedDate);
  const endDate = normalizeToEndOfMonth(normalizedDate);

  // Obtenir la date actuelle en UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Récupérer toutes les dépenses de l'utilisateur
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
    },
    include: {
      category: true,
      recurrence: true,
    },
  });

  // Calculer le solde actuel (toutes les dépenses jusqu'à aujourd'hui)
  const currentBalance = expenses
    .filter(
      expense => isBefore(new Date(expense.date), today) || isSameDay(new Date(expense.date), today)
    )
    .reduce((acc, expense) => acc + expense.amount, 0);

  // Calculer les dépenses du mois sélectionné
  const monthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return (
      (isAfter(expenseDate, startDate) || isSameDay(expenseDate, startDate)) &&
      (isBefore(expenseDate, endDate) || isSameDay(expenseDate, endDate))
    );
  });

  // Calculer le total des dépenses et revenus du mois
  const monthlyExpensesTotal = monthExpenses
    .filter(expense => expense.amount < 0)
    .reduce((acc, expense) => acc + expense.amount, 0);

  const monthlyIncomeTotal = monthExpenses
    .filter(expense => expense.amount > 0)
    .reduce((acc, expense) => acc + expense.amount, 0);

  const futureExpenses = monthExpenses
    .filter(
      expense => isAfter(new Date(expense.date), today) && !isSameDay(new Date(expense.date), today)
    )
    .reduce((acc, expense) => acc + expense.amount, 0);

  monthExpenses.filter(
    expense => isAfter(new Date(expense.date), today) && !isSameDay(new Date(expense.date), today)
  );

  const endOfMonthBalance = currentBalance + futureExpenses;

  // Récupérer les dépenses récurrentes
  const recurringExpenses = expenses
    .filter(expense => expense.isRecurring && expense.recurrence)
    .map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      frequency: expense.recurrence?.frequency || 'monthly',
      nextDate: expense.recurrence?.startDate || new Date(),
    }));

  // Générer les occurrences futures des dépenses récurrentes pour le mois en cours
  const generatedFutureOccurrences = generateFutureOccurrencesForMonth(
    recurringExpenses,
    today,
    endDate
  );

  // Calculer le montant total des occurrences futures générées
  const generatedFutureAmount = generatedFutureOccurrences.reduce(
    (acc, occurrence) => acc + occurrence.amount,
    0
  );

  // Ajouter les occurrences futures générées au solde de fin de mois
  const endOfMonthBalanceWithRecurring = endOfMonthBalance + generatedFutureAmount;

  // Calculer les dépenses par catégorie
  const categoryExpensesMap = new Map<string, { name: string; amount: number; color: string }>();

  monthExpenses.forEach(expense => {
    if (expense.category) {
      const { id, name, color } = expense.category;
      const existingCategory = categoryExpensesMap.get(id);

      if (existingCategory) {
        existingCategory.amount += expense.amount;
      } else {
        categoryExpensesMap.set(id, {
          name,
          amount: expense.amount,
          color: color || '#94a3b8', // Couleur par défaut si non définie
        });
      }
    }
  });

  const categoryExpenses = Array.from(categoryExpensesMap.entries()).map(([id, category]) => ({
    id,
    ...category,
  }));

  return {
    currentBalance,
    endOfMonthBalance: endOfMonthBalanceWithRecurring,
    income: monthlyIncomeTotal,
    expenses: monthlyExpensesTotal,
    recurringExpenses: recurringExpenses,
    categoryExpenses,
    selectedMonth: normalizedDate,
  };
}

/**
 * Génère les occurrences futures des dépenses récurrentes pour le mois en cours
 */
function generateFutureOccurrencesForMonth(
  recurringExpenses: {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    nextDate: Date;
  }[],
  today: Date,
  endDate: Date
): { description: string; amount: number; date: Date }[] {
  const occurrences: { description: string; amount: number; date: Date }[] = [];

  recurringExpenses.forEach(expense => {
    const { description, amount, frequency, nextDate } = expense;
    let currentDate = new Date(nextDate);

    // Si la prochaine date est après la fin du mois, on ignore cette dépense
    if (isAfter(currentDate, endDate)) {
      return;
    }

    // Si la prochaine date est avant aujourd'hui, on calcule la prochaine occurrence
    if (isBefore(currentDate, today)) {
      switch (frequency) {
        case 'daily':
          currentDate = addDays(today, 1);
          break;
        case 'weekly':
          // Trouver la prochaine occurrence hebdomadaire
          while (isBefore(currentDate, today)) {
            currentDate = addWeeks(currentDate, 1);
          }
          break;
        case 'monthly':
          // Trouver la prochaine occurrence mensuelle
          while (isBefore(currentDate, today)) {
            currentDate = addMonths(currentDate, 1);
          }
          break;
        case 'yearly':
          // Trouver la prochaine occurrence annuelle
          while (isBefore(currentDate, today)) {
            currentDate = addYears(currentDate, 1);
          }
          break;
      }
    }

    // Générer toutes les occurrences jusqu'à la fin du mois
    while (!isAfter(currentDate, endDate)) {
      // Vérifier si la date est dans le futur par rapport à aujourd'hui
      if (isAfter(currentDate, today)) {
        occurrences.push({
          description,
          amount, // Utiliser le montant original (peut être négatif)
          date: new Date(currentDate),
        });
      }

      // Calculer la prochaine occurrence
      switch (frequency) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
        case 'yearly':
          currentDate = addYears(currentDate, 1);
          break;
        default:
          // Par défaut, on arrête la génération
          currentDate = new Date(endDate);
          currentDate = addDays(currentDate, 1); // Pour sortir de la boucle
      }
    }
  });

  return occurrences;
}
