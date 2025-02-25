import { prisma } from '@/lib/prisma';
import { endOfMonth, format, isAfter, isBefore, startOfMonth } from 'date-fns';

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

export async function getDashboardData(
  userId: string,
  selectedDate?: Date
): Promise<DashboardData> {
  const today = new Date();
  const selectedMonth = selectedDate || today;
  const startOfSelectedMonth = startOfMonth(selectedMonth);
  const endOfSelectedMonth = endOfMonth(selectedMonth);

  // Récupérer toutes les dépenses de l'utilisateur
  const allExpenses = await prisma.expense.findMany({
    where: {
      userId,
    },
    include: {
      category: true,
      recurrence: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  // Calculer les entrées et sorties du mois sélectionné
  const selectedMonthExpenses = allExpenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    return (
      !isBefore(expenseDate, startOfSelectedMonth) && !isAfter(expenseDate, endOfSelectedMonth)
    );
  });

  const income = selectedMonthExpenses
    .filter(expense => expense.amount > 0)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const expenses = selectedMonthExpenses
    .filter(expense => expense.amount < 0)
    .reduce((sum, expense) => sum + Math.abs(expense.amount), 0);

  // Calculer le solde actuel (toutes les dépenses jusqu'à aujourd'hui)
  const currentBalance = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        isBefore(expenseDate, today) ||
        format(expenseDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Calculer le solde de fin de mois (toutes les dépenses jusqu'à la fin du mois sélectionné)
  const endOfMonthBalance = allExpenses
    .filter(expense => {
      const expenseDate = new Date(expense.date);
      return (
        isBefore(expenseDate, endOfSelectedMonth) ||
        format(expenseDate, 'yyyy-MM-dd') === format(endOfSelectedMonth, 'yyyy-MM-dd')
      );
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  // Récupérer les dépenses récurrentes
  const recurringExpenses = allExpenses
    .filter(expense => expense.isRecurring && expense.recurrence)
    .map(expense => ({
      id: expense.id,
      description: expense.description,
      amount: Math.abs(expense.amount),
      frequency: expense.recurrence?.frequency || 'monthly',
      nextDate: expense.recurrence?.startDate || new Date(),
    }));

  // Calculer les dépenses par catégorie pour le mois sélectionné
  const categoryMap = new Map<
    string,
    { id: string; name: string; amount: number; color: string }
  >();

  selectedMonthExpenses
    .filter(expense => expense.amount < 0 && expense.category)
    .forEach(expense => {
      if (!expense.category) return;

      const categoryId = expense.category.id;
      const existingCategory = categoryMap.get(categoryId);

      if (existingCategory) {
        existingCategory.amount += Math.abs(expense.amount);
      } else {
        categoryMap.set(categoryId, {
          id: categoryId,
          name: expense.category.name,
          amount: Math.abs(expense.amount),
          color: expense.category.color || '#000000',
        });
      }
    });

  const categoryExpenses = Array.from(categoryMap.values());

  // Retourner des données par défaut si aucune donnée n'est disponible
  if (categoryExpenses.length === 0) {
    categoryExpenses.push({
      id: 'default',
      name: 'Aucune catégorie',
      amount: 0,
      color: '#cccccc',
    });
  }

  return {
    currentBalance,
    endOfMonthBalance,
    income,
    expenses,
    recurringExpenses,
    categoryExpenses,
    selectedMonth: startOfSelectedMonth,
  };
}
