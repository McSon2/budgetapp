import { prisma } from '@/lib/prisma';
import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, isSameDay } from 'date-fns';

export type Expense = {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceEndDate?: string;
};

// Fonction utilitaire pour normaliser une date en UTC
const normalizeDate = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Créer une nouvelle date en préservant le jour, mois et année
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  // Créer une nouvelle date avec le jour spécifié à midi UTC
  // Utiliser midi (12:00) au lieu de minuit (00:00) pour éviter les problèmes de fuseau horaire
  const normalized = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
  console.log(`Normalizing date: ${dateObj.toISOString()} -> ${normalized.toISOString()}`);
  return normalized;
};

export async function getExpenses(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Expense[]> {
  console.log(`Getting expenses for user ${userId} from ${startDate} to ${endDate}`);

  // Préparer les conditions de filtrage
  const whereCondition: {
    userId: string;
    date?: {
      gte?: Date;
      lte?: Date;
    };
  } = { userId };

  // Ajouter le filtrage par date si les dates sont fournies
  if (startDate || endDate) {
    whereCondition.date = {};

    if (startDate) {
      whereCondition.date.gte = normalizeDate(startDate);
    }

    if (endDate) {
      whereCondition.date.lte = normalizeDate(endDate);
    }
  }

  console.log('Where condition:', JSON.stringify(whereCondition, null, 2));

  // Récupérer les dépenses depuis la base de données via Prisma
  const dbExpenses = await prisma.expense.findMany({
    where: whereCondition,
    include: { category: true, recurrence: true },
    orderBy: { date: 'desc' },
  });

  console.log(`Found ${dbExpenses.length} expenses`);

  // Transformer les données de la base de données au format attendu par le frontend
  return dbExpenses.map(expense => ({
    id: expense.id,
    name: expense.description,
    amount: expense.amount,
    date: expense.date.toISOString(),
    category: expense.category?.name || 'Non catégorisé',
    isRecurring: expense.isRecurring,
    recurrenceFrequency: expense.recurrence?.frequency,
    recurrenceEndDate: expense.recurrence?.endDate?.toISOString(),
  }));
}

export async function addExpense(
  userId: string,
  expense: Omit<Expense, 'id'> & {
    isRecurring?: boolean;
    recurrence?: {
      frequency: string;
      startDate: string;
      endDate?: string;
    };
  }
): Promise<Expense> {
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
    const recurrence = await prisma.recurrence.create({
      data: {
        frequency: expense.recurrence.frequency,
        interval: 1,
        startDate: normalizeDate(expense.recurrence.startDate),
        endDate: expense.recurrence.endDate ? normalizeDate(expense.recurrence.endDate) : null,
      },
    });

    recurrenceId = recurrence.id;
  }

  // Créer la dépense dans la base de données
  const dbExpense = await prisma.expense.create({
    data: {
      description: expense.name,
      amount: expense.amount,
      date: normalizeDate(expense.date),
      isRecurring: expense.isRecurring || false,
      userId,
      categoryId,
      recurrenceId,
    },
    include: { category: true, recurrence: true },
  });

  // Retourner la dépense au format attendu par le frontend
  return {
    id: dbExpense.id,
    name: dbExpense.description,
    amount: dbExpense.amount,
    date: dbExpense.date.toISOString(),
    category: dbExpense.category?.name || 'Non catégorisé',
    isRecurring: dbExpense.isRecurring,
    recurrenceFrequency: dbExpense.recurrence?.frequency,
    recurrenceEndDate: dbExpense.recurrence?.endDate?.toISOString(),
  };
}

export async function updateExpense(
  id: string,
  expense: Partial<Expense> & {
    isRecurring?: boolean;
    recurrence?: {
      frequency: string;
      startDate: string;
      endDate?: string;
    };
  }
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
  return {
    id: dbExpense.id,
    name: dbExpense.description,
    amount: dbExpense.amount,
    date: dbExpense.date.toISOString(),
    category: dbExpense.category?.name || 'Non catégorisé',
    isRecurring: dbExpense.isRecurring,
    recurrenceFrequency: dbExpense.recurrence?.frequency,
    recurrenceEndDate: dbExpense.recurrence?.endDate?.toISOString(),
  };
}

export async function deleteExpense(id: string): Promise<void> {
  // Supprimer la dépense de la base de données
  await prisma.expense.delete({
    where: { id },
  });
}

export async function getRecurringExpenses(userId: string): Promise<
  {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    nextDate: string;
  }[]
> {
  // Récupérer les dépenses récurrentes depuis la base de données
  const recurringExpenses = await prisma.expense.findMany({
    where: {
      userId,
      isRecurring: true,
      recurrenceId: { not: null },
    },
    include: {
      recurrence: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  const today = new Date();
  console.log('Date actuelle (getRecurringExpenses):', today);

  // Transformer les données pour le format attendu par le frontend
  return recurringExpenses.map(expense => {
    const startDate = expense.recurrence?.startDate || expense.date;
    const frequency = expense.recurrence?.frequency || 'monthly';

    console.log(
      `Traitement de ${expense.description}: startDate=${startDate}, frequency=${frequency}`
    );

    // Si la date de départ est dans le futur, c'est la prochaine date
    if (isAfter(startDate, today)) {
      console.log(
        `${expense.description}: Date de départ dans le futur, prochaine date = ${startDate}`
      );
      return {
        id: expense.id,
        description: expense.description,
        amount: Math.abs(expense.amount),
        frequency,
        nextDate: startDate.toISOString(),
      };
    }

    // Calculer la prochaine occurrence
    let nextDate = new Date(startDate);

    // Pour les dépenses annuelles, on doit s'assurer que la prochaine date est dans le futur
    if (frequency === 'yearly') {
      // Extraire le jour et le mois de la date de départ
      const month = nextDate.getMonth();
      const day = nextDate.getDate();

      // Créer une date avec l'année courante
      nextDate = new Date(today.getFullYear(), month, day);

      // Si cette date est déjà passée, ajouter un an
      if (isBefore(nextDate, today)) {
        nextDate = new Date(today.getFullYear() + 1, month, day);
      }

      console.log(
        `${expense.description}: Date annuelle ajustée = ${nextDate}, année = ${nextDate.getFullYear()}`
      );

      return {
        id: expense.id,
        description: expense.description,
        amount: Math.abs(expense.amount),
        frequency,
        nextDate: nextDate.toISOString(),
      };
    }

    // Pour les autres fréquences, utiliser la logique existante
    let iterations = 0;
    const MAX_ITERATIONS = 1000; // Éviter les boucles infinies

    while (isBefore(nextDate, today) || isSameDay(nextDate, today)) {
      // Sécurité pour éviter les boucles infinies
      if (iterations++ > MAX_ITERATIONS) {
        console.error(
          `Trop d'itérations pour calculer la prochaine date de ${expense.description}`
        );
        break;
      }

      // Calculer la prochaine date en fonction de la fréquence
      switch (frequency) {
        case 'daily':
          nextDate = addDays(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
        default:
          // Par défaut, mensuel
          nextDate = addMonths(nextDate, 1);
      }
    }

    console.log(
      `${expense.description}: Prochaine date calculée = ${nextDate}, année = ${nextDate.getFullYear()}`
    );

    return {
      id: expense.id,
      description: expense.description,
      amount: Math.abs(expense.amount), // Toujours positif pour l'affichage
      frequency,
      nextDate: nextDate.toISOString(),
    };
  });
}
