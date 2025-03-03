import { prisma } from '@/lib/prisma';
import { Expense, ExpenseWithRecurrence } from './types';
import { mapDbExpenseToExpense, normalizeDate } from './utils';

/**
 * Ajoute une nouvelle dépense pour un utilisateur
 * @param userId - L'ID de l'utilisateur
 * @param expense - Les données de la dépense à ajouter
 * @returns La dépense créée
 */
export async function addExpense(userId: string, expense: ExpenseWithRecurrence): Promise<Expense> {
  // Normaliser la date de la dépense
  const normalizedDate = normalizeDate(expense.date);

  // Trouver ou créer la catégorie
  let categoryId: string | null = null;

  if (expense.category) {
    const category = await prisma.category.findFirst({
      where: {
        name: expense.category,
        userId,
      },
    });

    if (category) {
      categoryId = category.id;
    } else {
      // Créer une nouvelle catégorie si elle n'existe pas
      const newCategory = await prisma.category.create({
        data: {
          name: expense.category,
          userId,
        },
      });
      categoryId = newCategory.id;
    }
  }

  // Créer une récurrence si nécessaire
  let recurrenceId: string | null = null;

  if (expense.isRecurring && expense.recurrence) {
    const normalizedStartDate = normalizeDate(expense.recurrence.startDate);

    let normalizedEndDate = null;
    if (expense.recurrence.endDate) {
      normalizedEndDate = normalizeDate(expense.recurrence.endDate);
    }

    const recurrence = await prisma.recurrence.create({
      data: {
        frequency: expense.recurrence.frequency,
        interval: 1,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      },
    });

    recurrenceId = recurrence.id;
  }

  // Créer la dépense dans la base de données
  const dbExpense = await prisma.expense.create({
    data: {
      description: expense.name,
      amount: expense.amount,
      date: normalizedDate,
      isRecurring: expense.isRecurring || false,
      userId,
      categoryId,
      recurrenceId,
    },
    include: { category: true, recurrence: true },
  });

  // Retourner la dépense au format attendu par le frontend
  return mapDbExpenseToExpense(dbExpense);
}

/**
 * Met à jour une dépense existante
 * @param id - L'ID de la dépense à mettre à jour
 * @param expense - Les données à mettre à jour
 * @returns La dépense mise à jour
 */
export async function updateExpense(
  id: string,
  expense: Partial<ExpenseWithRecurrence>
): Promise<Expense> {
  // Gérer la catégorie si elle est fournie
  let categoryId: string | null | undefined = undefined;

  if (expense.category) {
    // Récupérer d'abord la dépense pour obtenir l'userId
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingExpense) {
      throw new Error('Expense not found');
    }

    const category = await prisma.category.findFirst({
      where: {
        name: expense.category,
        userId: existingExpense.userId,
      },
    });

    if (category) {
      categoryId = category.id;
    } else {
      // Créer une nouvelle catégorie si elle n'existe pas
      const newCategory = await prisma.category.create({
        data: {
          name: expense.category,
          userId: existingExpense.userId,
        },
      });
      categoryId = newCategory.id;
    }
  }

  // Gérer la récurrence si elle est fournie
  let recurrenceId: string | null | undefined = undefined;

  if (expense.isRecurring !== undefined) {
    if (expense.isRecurring && expense.recurrence) {
      // Récupérer la dépense existante pour voir si elle a déjà une récurrence
      const existingExpense = await prisma.expense.findUnique({
        where: { id },
        include: { recurrence: true },
      });

      if (existingExpense?.recurrenceId) {
        // Mettre à jour la récurrence existante
        await prisma.recurrence.update({
          where: { id: existingExpense.recurrenceId },
          data: {
            frequency: expense.recurrence.frequency,
            interval: 1,
            startDate: normalizeDate(expense.recurrence.startDate),
            endDate: expense.recurrence.endDate ? normalizeDate(expense.recurrence.endDate) : null,
          },
        });
        recurrenceId = existingExpense.recurrenceId;
      } else {
        // Créer une nouvelle récurrence
        const newRecurrence = await prisma.recurrence.create({
          data: {
            frequency: expense.recurrence.frequency,
            interval: 1,
            startDate: normalizeDate(expense.recurrence.startDate),
            endDate: expense.recurrence.endDate ? normalizeDate(expense.recurrence.endDate) : null,
          },
        });
        recurrenceId = newRecurrence.id;
      }
    } else if (!expense.isRecurring) {
      // Si la dépense n'est plus récurrente, on supprime la récurrence
      recurrenceId = null;
    }
  }

  // Mettre à jour la dépense dans la base de données
  const dbExpense = await prisma.expense.update({
    where: { id },
    data: {
      description: expense.name,
      amount: expense.amount,
      date: expense.date ? normalizeDate(expense.date) : undefined,
      categoryId,
      isRecurring: expense.isRecurring,
      recurrenceId,
    },
    include: { category: true, recurrence: true },
  });

  // Retourner la dépense mise à jour au format attendu par le frontend
  return mapDbExpenseToExpense(dbExpense);
}

/**
 * Supprime une dépense
 * @param id - L'ID de la dépense à supprimer
 */
export async function deleteExpense(id: string): Promise<void> {
  // Supprimer la dépense de la base de données
  await prisma.expense.delete({
    where: { id },
  });
}

/**
 * Supprime plusieurs dépenses
 * @param ids - Les IDs des dépenses à supprimer
 */
export async function deleteMultipleExpenses(ids: string[]): Promise<void> {
  // Supprimer les dépenses de la base de données
  await prisma.expense.deleteMany({
    where: {
      id: {
        in: ids,
      },
    },
  });
}
