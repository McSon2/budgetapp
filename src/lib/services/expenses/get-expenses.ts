import { prisma } from '@/lib/prisma';
import { endOfMonth, startOfMonth } from 'date-fns';
import { generateRecurringExpensesForPeriod } from './recurring-expenses';
import { Expense, ExpenseFilters, ExpenseSearchResult, PaginationOptions } from './types';
import { mapDbExpenseToExpense, matchesFilters } from './utils';

/**
 * Récupère les dépenses d'un utilisateur pour un mois spécifique
 * @param userId - L'ID de l'utilisateur
 * @param month - Le mois pour lequel récupérer les dépenses (format ISO string)
 * @param filters - Les filtres à appliquer
 * @param pagination - Les options de pagination
 * @returns Les dépenses correspondant aux critères
 */
export async function getExpenses(
  userId: string,
  month: string,
  filters?: ExpenseFilters,
  pagination?: PaginationOptions
): Promise<ExpenseSearchResult> {
  // Normaliser la date du mois
  const date = new Date(month);
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  // Extraire le mois et l'année de la date demandée (pas des dates UTC qui peuvent être décalées)
  const requestedMonth = date.getMonth(); // 0-11 (janvier = 0)
  const requestedYear = date.getFullYear();

  // Récupérer les dépenses depuis la base de données
  const dbExpenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: true,
      recurrence: true,
    },
    orderBy: {
      date: 'desc',
    },
    skip: pagination?.skip || 0,
    take: pagination?.take || 50,
  });

  // Convertir les dépenses au format attendu par le frontend
  const expenses = dbExpenses.map(mapDbExpenseToExpense);

  // Récupérer les dépenses récurrentes pour ce mois
  // Utiliser le mois et l'année de la date demandée (pas des dates UTC)
  const recurringExpenses = await generateRecurringExpensesForPeriod(
    userId,
    startDate.toISOString(),
    endDate.toISOString(),
    requestedMonth,
    requestedYear
  );

  // Fusionner les dépenses normales et récurrentes
  const allExpenses = [...expenses, ...recurringExpenses];

  // Appliquer les filtres si nécessaire
  let filteredExpenses = allExpenses;
  if (filters) {
    filteredExpenses = allExpenses.filter(expense =>
      matchesFilters(expense, filters.search, filters.categories)
    );
  }

  // Trier les dépenses par date (les plus récentes d'abord)
  filteredExpenses.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Appliquer la pagination si nécessaire
  let paginatedExpenses = filteredExpenses;
  if (pagination) {
    const { skip = 0, take = 50 } = pagination;
    paginatedExpenses = filteredExpenses.slice(skip, skip + take);
  }

  return {
    expenses: paginatedExpenses,
    total: filteredExpenses.length,
    hasMore: filteredExpenses.length > (pagination?.skip || 0) + (pagination?.take || 50),
  };
}

/**
 * Récupère une dépense spécifique par son ID
 * @param id - L'ID de la dépense à récupérer
 * @returns La dépense correspondante ou null si non trouvée
 */
export async function getExpenseById(id: string): Promise<Expense | null> {
  const dbExpense = await prisma.expense.findUnique({
    where: { id },
    include: {
      category: true,
      recurrence: true,
    },
  });

  if (!dbExpense) {
    return null;
  }

  return mapDbExpenseToExpense(dbExpense);
}
