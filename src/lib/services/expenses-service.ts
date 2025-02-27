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
  isGenerated?: boolean; // Indique si c'est une occurrence générée d'une dépense récurrente
};

// Fonction utilitaire pour normaliser une date en UTC
const normalizeDate = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Extraire les composants de la date en tenant compte du fuseau horaire local
  // Utiliser getDate() au lieu de getUTCDate() pour respecter le jour local
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  // Créer une nouvelle date avec le jour spécifié à midi UTC
  // Utiliser midi (12:00) au lieu de minuit (00:00) pour éviter les problèmes de fuseau horaire
  const normalized = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));

  // Vérifier si c'est le premier jour du mois
  const isFirstDayOfMonth = day === 1;

  // Si c'est le premier jour du mois, s'assurer que la date normalisée est bien le premier jour du mois
  if (isFirstDayOfMonth) {
    // Vérifier que la date normalisée est bien le premier jour du mois
    if (normalized.getUTCDate() !== 1) {
      console.warn(
        `Correction de date: Le premier jour du mois a été converti incorrectement. Ajustement forcé au 1er jour.`
      );
      // Forcer au premier jour du mois
      normalized.setUTCDate(1);
    }
  }

  // Vérifier si c'est le dernier jour du mois
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const isLastDayOfMonth = day === lastDayOfMonth;

  // Si c'est le dernier jour du mois, s'assurer que la date normalisée est bien le dernier jour du mois
  if (isLastDayOfMonth) {
    // Vérifier que la date normalisée est bien le dernier jour du mois
    if (normalized.getUTCDate() !== lastDayOfMonth) {
      console.warn(
        `Correction de date: Le dernier jour du mois a été converti incorrectement. Ajustement forcé au dernier jour.`
      );
      // Forcer au dernier jour du mois
      normalized.setUTCDate(lastDayOfMonth);
    }
  }

  return normalized;
};

export async function getExpenses(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<Expense[]> {
  // Préparer les conditions de filtrage
  const whereCondition: {
    userId: string;
    date?: {
      gte?: Date;
      lte?: Date;
    };
  } = { userId };

  // Extraire le mois et l'année des dates de début et de fin pour la vérification
  let startMonth: number | undefined;
  let startYear: number | undefined;

  // Ajouter le filtrage par date si les dates sont fournies
  if (startDate || endDate) {
    whereCondition.date = {};

    if (startDate) {
      // Pour la date de début, nous voulons utiliser le début de la journée
      const startDateObj = new Date(startDate);
      startDateObj.setUTCHours(0, 0, 0, 0);
      whereCondition.date.gte = startDateObj;

      // Extraire le mois et l'année pour la vérification
      startMonth = startDateObj.getUTCMonth();
      startYear = startDateObj.getUTCFullYear();
    }

    if (endDate) {
      // Pour la date de fin, nous voulons utiliser la fin de la journée
      const endDateObj = new Date(endDate);
      // Utiliser 23:59:59.999 pour s'assurer d'inclure toutes les transactions du dernier jour
      endDateObj.setUTCHours(23, 59, 59, 999);
      whereCondition.date.lte = endDateObj;
    }
  }

  // Récupérer les dépenses depuis la base de données via Prisma
  const dbExpenses = await prisma.expense.findMany({
    where: whereCondition,
    include: { category: true, recurrence: true },
    orderBy: { date: 'desc' },
  });

  // Filtrer les dépenses pour s'assurer qu'elles sont dans le mois demandé
  // et gérer correctement les problèmes de fuseau horaire
  const filteredDbExpenses =
    startMonth !== undefined && startYear !== undefined
      ? dbExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          const expenseMonth = expenseDate.getUTCMonth();
          const expenseYear = expenseDate.getUTCFullYear();
          const expenseDay = expenseDate.getUTCDate();
          const expenseHour = expenseDate.getUTCHours();

          // Vérifier si la transaction est réellement du mois demandé
          // Calculer correctement le dernier jour du mois
          const lastDayOfMonth = new Date(Date.UTC(expenseYear, expenseMonth + 1, 0)).getUTCDate();
          const isLastDayOfMonth = expenseDay === lastDayOfMonth;
          const isLateHour = expenseHour >= 22;
          const isProbablyNextMonth = isLastDayOfMonth && isLateHour;

          // Si c'est probablement une transaction du mois suivant, l'exclure
          if (isProbablyNextMonth) {
            console.warn(
              `Filtrage: ${expense.description} (${expense.date.toISOString()}) est probablement une transaction du mois suivant (jour ${expenseDay}/${lastDayOfMonth}, heure ${expenseHour})`
            );
            return false;
          }

          // Vérification standard du mois et de l'année
          const isInRequestedMonth = expenseMonth === startMonth && expenseYear === startYear;

          if (!isInRequestedMonth) {
            console.warn(
              `Filtrage: ${expense.description} (${expense.date.toISOString()}) n'est pas dans le mois demandé (${startMonth + 1}/${startYear}), mais dans le mois ${expenseMonth + 1}/${expenseYear}`
            );
            return false;
          }

          return true;
        })
      : dbExpenses;

  if (filteredDbExpenses.length !== dbExpenses.length) {
    console.warn(
      `Filtrage: ${dbExpenses.length - filteredDbExpenses.length} transactions ont été filtrées car elles n'appartiennent pas au mois demandé`
    );
  }

  // Transformer les données de la base de données au format attendu par le frontend
  const regularExpenses = filteredDbExpenses.map(expense => ({
    id: expense.id,
    name: expense.description,
    amount: expense.amount,
    date: expense.date.toISOString(),
    category: expense.category?.name || 'Non catégorisé',
    isRecurring: expense.isRecurring,
    recurrenceFrequency: expense.recurrence?.frequency,
    recurrenceEndDate: expense.recurrence?.endDate?.toISOString(),
  }));

  // Si nous avons des dates de début et de fin, générer les occurrences des dépenses récurrentes
  if (startDate && endDate) {
    // Récupérer toutes les dépenses récurrentes de l'utilisateur
    const recurringExpenses = await prisma.expense.findMany({
      where: {
        userId,
        isRecurring: true,
      },
      include: { category: true, recurrence: true },
    });

    // Convertir les dates de début et de fin en objets Date
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Générer les occurrences pour le mois sélectionné
    const generatedExpenses = generateRecurringExpensesForPeriod(recurringExpenses, start, end);

    // Ajouter les occurrences générées à la liste des dépenses
    return [...regularExpenses, ...generatedExpenses];
  }

  return regularExpenses;
}

/**
 * Génère les occurrences des dépenses récurrentes pour une période donnée
 */
function generateRecurringExpensesForPeriod(
  recurringExpenses: {
    id: string;
    description: string;
    amount: number;
    date: Date;
    isRecurring: boolean;
    category?: { name: string } | null;
    recurrence?: {
      frequency: string;
      startDate: Date;
      endDate?: Date | null;
    } | null;
  }[],
  startDate: Date,
  endDate: Date
): Expense[] {
  const generatedExpenses: Expense[] = [];

  // Vérifier que les dates correspondent au même mois et à la même année
  const startMonth = startDate.getUTCMonth();
  const startYear = startDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();
  const endYear = endDate.getUTCFullYear();

  if (startMonth !== endMonth || startYear !== endYear) {
    console.warn(
      `Les dates de début et de fin ne correspondent pas au même mois: ${startMonth + 1}/${startYear} - ${endMonth + 1}/${endYear}`
    );
  }

  // Créer un ensemble pour suivre les dépenses originales déjà existantes
  // Utiliser un format qui inclut le mois et l'année pour éviter les confusions entre les mois
  const existingExpenseDates = new Set<string>();

  recurringExpenses.forEach(expense => {
    if (!expense.recurrence) {
      return;
    }

    const { id, description, amount, category, recurrence } = expense;
    const { frequency, startDate: recurrenceStart } = recurrence;

    // Ignorer les dépenses dont la date de début est après la fin de la période
    if (recurrenceStart > endDate) {
      return;
    }

    // Ajouter la date originale à l'ensemble des dates existantes
    // Utiliser un format qui inclut le mois et l'année pour éviter les confusions entre les mois
    const originalMonth = recurrenceStart.getUTCMonth();
    const originalYear = recurrenceStart.getUTCFullYear();
    const originalDay = recurrenceStart.getUTCDate();
    const originalDateKey = `${id}-${originalYear}-${originalMonth + 1}-${originalDay}`;
    existingExpenseDates.add(originalDateKey);

    let currentDate = new Date(recurrenceStart);

    // Trouver la première occurrence dans la période ou après la date de début
    while (currentDate < startDate) {
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
          return; // Fréquence non reconnue
      }
    }

    // Générer toutes les occurrences dans la période
    while (currentDate <= endDate) {
      // Vérifier que l'occurrence est dans le même mois que la période demandée
      const occurrenceMonth = currentDate.getUTCMonth();
      const occurrenceYear = currentDate.getUTCFullYear();
      const occurrenceDay = currentDate.getUTCDate();

      if (occurrenceMonth !== startMonth || occurrenceYear !== startYear) {
        break; // Sortir de la boucle si on dépasse le mois demandé
      }

      // Créer une clé unique qui inclut le mois et l'année pour cette occurrence
      const dateKey = `${id}-${occurrenceYear}-${occurrenceMonth + 1}-${occurrenceDay}`;

      // Vérifier si cette date correspond à la date de début de la récurrence
      // ou si elle est déjà dans l'ensemble des dates existantes
      const isOriginalDateKey = dateKey === originalDateKey;
      const isExistingDateKey = existingExpenseDates.has(dateKey);

      if (isOriginalDateKey || isExistingDateKey) {
        // Ne rien faire si c'est la date originale ou une date existante
      } else {
        // Créer une occurrence pour cette date
        const generatedId = `${id}-${occurrenceYear}-${occurrenceMonth + 1}-${occurrenceDay}`;

        generatedExpenses.push({
          id: generatedId, // ID unique pour cette occurrence
          name: description,
          amount: amount,
          date: new Date(currentDate).toISOString(),
          category: category?.name || 'Non catégorisé',
          isRecurring: true,
          recurrenceFrequency: frequency,
          isGenerated: true, // Marquer comme générée pour pouvoir les distinguer
        });

        // Ajouter cette date à l'ensemble des dates existantes pour éviter les doublons
        existingExpenseDates.add(dateKey);
      }

      // Passer à la prochaine occurrence
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
      }
    }
  });
  return generatedExpenses;
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
  // Analyser la date pour vérifier si c'est une date de fin de mois en soirée
  const expenseDate = new Date(expense.date);
  const day = expenseDate.getDate();
  const month = expenseDate.getMonth();
  const year = expenseDate.getFullYear();
  const hour = expenseDate.getHours();

  // Vérifier si c'est le dernier jour du mois
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const isLastDayOfMonth = day === lastDayOfMonth;
  const isLateHour = hour >= 22;

  if (isLastDayOfMonth && isLateHour) {
    console.warn(
      `Attention: Transaction créée le dernier jour du mois (${day}/${month + 1}) à ${hour}h`
    );
    console.warn(`Cette transaction pourrait être considérée comme appartenant au mois suivant`);

    // Suggérer d'utiliser le premier jour du mois suivant
    const nextMonthDate = new Date(year, month + 1, 1, 12, 0, 0);
    console.warn(`Suggestion: Utiliser plutôt la date ${nextMonthDate.toISOString()}`);
  }

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

  // Normaliser la date de la dépense
  const normalizedDate = normalizeDate(expense.date);

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

  // Transformer les données pour le format attendu par le frontend
  return recurringExpenses.map(expense => {
    const startDate = expense.recurrence?.startDate || expense.date;
    const frequency = expense.recurrence?.frequency || 'monthly';

    // Si la date de départ est dans le futur, c'est la prochaine date
    if (isAfter(startDate, today)) {
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

    return {
      id: expense.id,
      description: expense.description,
      amount: Math.abs(expense.amount), // Toujours positif pour l'affichage
      frequency,
      nextDate: nextDate.toISOString(),
    };
  });
}
