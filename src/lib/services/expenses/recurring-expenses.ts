import { prisma } from '@/lib/prisma';
import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, isSameDay } from 'date-fns';
import { GeneratedExpense, RecurringExpense } from './types';
import { createDateKey, generateRecurrenceId } from './utils';

/**
 * Génère les occurrences de dépenses récurrentes pour une période donnée
 * @param userId - L'ID de l'utilisateur
 * @param startDateStr - La date de début de la période (format ISO string)
 * @param endDateStr - La date de fin de la période (format ISO string)
 * @param requestedMonth - Le mois demandé (0-11, où 0 = janvier)
 * @param requestedYear - L'année demandée
 * @returns Les dépenses récurrentes générées pour la période
 */
export async function generateRecurringExpensesForPeriod(
  userId: string,
  startDateStr: string,
  endDateStr: string,
  requestedMonth?: number,
  requestedYear?: number
): Promise<GeneratedExpense[]> {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  // Extraire le mois et l'année de la période demandée
  // Utiliser les paramètres explicites s'ils sont fournis, sinon utiliser la date de début
  const targetMonth = requestedMonth !== undefined ? requestedMonth : startDate.getMonth();
  const targetYear = requestedYear !== undefined ? requestedYear : startDate.getFullYear();

  console.log(
    `Génération des dépenses récurrentes pour ${targetMonth + 1}/${targetYear} (${startDateStr} à ${endDateStr})`
  );

  // Récupérer toutes les dépenses récurrentes de l'utilisateur
  const recurringExpenses = await prisma.expense.findMany({
    where: {
      userId,
      isRecurring: true,
      recurrenceId: { not: null },
    },
    include: {
      category: true,
      recurrence: true,
    },
  });

  console.log(`Nombre de dépenses récurrentes trouvées: ${recurringExpenses.length}`);

  // Récupérer toutes les dépenses existantes pour la période
  const existingExpenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      date: true,
    },
  });

  // Créer un ensemble des dates existantes pour éviter les doublons
  const existingExpenseDates = new Set<string>();
  existingExpenses.forEach(expense => {
    const date = expense.date;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    existingExpenseDates.add(`${expense.id}-${year}-${month}-${day}`);
  });

  // Générer les occurrences pour chaque dépense récurrente
  const generatedExpenses: GeneratedExpense[] = [];

  recurringExpenses.forEach(expense => {
    if (!expense.recurrence) return;

    const { id, description, amount } = expense;
    const { frequency, startDate: recurrenceStartStr } = expense.recurrence;
    const recurrenceStart = new Date(recurrenceStartStr);
    const category = expense.category?.name || 'Non catégorisé';

    console.log(
      `Traitement de la dépense récurrente: ${description} (${frequency}, début: ${recurrenceStartStr})`
    );

    // Utiliser un format qui inclut le mois et l'année pour éviter les confusions entre les mois
    const originalDateKey = createDateKey(id, recurrenceStart);
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

    console.log(`Première occurrence pour ${description}: ${currentDate.toISOString()}`);

    // Générer toutes les occurrences dans la période
    while (currentDate <= endDate) {
      // Vérifier que l'occurrence est dans le même mois que la période demandée
      // Utiliser getMonth() au lieu de getUTCMonth() pour éviter les problèmes de fuseau horaire
      const occurrenceMonth = currentDate.getMonth();
      const occurrenceYear = currentDate.getFullYear();

      // Vérifier si l'occurrence est dans la période demandée
      // et si elle est dans le mois demandé
      if (occurrenceMonth === targetMonth && occurrenceYear === targetYear) {
        // Créer une clé unique pour cette occurrence
        const dateKey = createDateKey(id, currentDate);

        // Vérifier si cette date correspond à la date de début de la récurrence
        // ou si elle est déjà dans l'ensemble des dates existantes
        const isOriginalDateKey = dateKey === originalDateKey;
        const isExistingDateKey = existingExpenseDates.has(dateKey);

        if (isOriginalDateKey || isExistingDateKey) {
          // Ne rien faire si c'est la date originale ou une date existante
          console.log(
            `Occurrence ignorée pour ${description} à ${currentDate.toISOString()} (déjà existante)`
          );
        } else {
          // Créer une occurrence pour cette date
          const generatedId = generateRecurrenceId(id, currentDate);

          generatedExpenses.push({
            id: generatedId,
            name: description,
            amount: amount,
            date: new Date(currentDate).toISOString(),
            category: category,
            isRecurring: true,
            recurrenceFrequency: frequency,
            isGenerated: true,
          });

          console.log(`Occurrence générée pour ${description} à ${currentDate.toISOString()}`);

          // Ajouter cette date à l'ensemble des dates existantes pour éviter les doublons
          existingExpenseDates.add(dateKey);
        }
      } else {
        console.log(
          `Occurrence ignorée pour ${description} à ${currentDate.toISOString()} (mois différent: ${occurrenceMonth + 1}/${occurrenceYear} vs ${targetMonth + 1}/${targetYear})`
        );
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

  console.log(`Nombre de dépenses récurrentes générées: ${generatedExpenses.length}`);
  return generatedExpenses;
}

/**
 * Récupère les dépenses récurrentes d'un utilisateur
 * @param userId - L'ID de l'utilisateur
 * @returns Les dépenses récurrentes avec leur prochaine date d'occurrence
 */
export async function getRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
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
