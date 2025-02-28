import { prisma } from '@/lib/prisma';
import console from 'console';
import { addDays, addMonths, addWeeks, addYears, isAfter, isSameDay } from 'date-fns';

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

  // Extraire l'année et le mois
  const year = dateObj.getUTCFullYear();
  const month = dateObj.getUTCMonth();

  // Calculer le dernier jour du mois en créant une date au jour 0 du mois suivant
  // (ce qui équivaut au dernier jour du mois actuel)
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Créer une nouvelle date au dernier jour du mois à 23:59:59.999
  const normalized = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999));

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

  // MODIFICATION IMPORTANTE: Pour les besoins de test avec des dates futures,
  // nous allons considérer que nous sommes au dernier jour du mois sélectionné
  // Cela permettra d'inclure toutes les transactions du mois dans le calcul du solde

  // Calculer le dernier jour du mois sélectionné
  const year = startDate.getUTCFullYear();
  const month = startDate.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Créer une date simulée au dernier jour du mois
  const simulatedToday = new Date(Date.UTC(year, month, lastDayOfMonth, 23, 59, 59, 999));

  // Déterminer si le mois sélectionné est le mois courant
  // Utiliser la date réelle pour cette détermination
  const isCurrentMonth =
    today.getUTCFullYear() === startDate.getUTCFullYear() &&
    today.getUTCMonth() === startDate.getUTCMonth();

  // Déterminer si le mois sélectionné est un mois passé
  const isPastMonth =
    startDate.getUTCFullYear() < today.getUTCFullYear() ||
    (startDate.getUTCFullYear() === today.getUTCFullYear() &&
      startDate.getUTCMonth() < today.getUTCMonth());

  // Déterminer si le mois sélectionné est un mois futur
  const isFutureMonth =
    startDate.getUTCFullYear() > today.getUTCFullYear() ||
    (startDate.getUTCFullYear() === today.getUTCFullYear() &&
      startDate.getUTCMonth() > today.getUTCMonth());

  // Date limite pour le calcul du solde actuel
  // MODIFICATION: Pour les mois futurs ou le mois courant, utiliser la date simulée (dernier jour du mois)
  // pour inclure toutes les transactions du mois
  const currentBalanceEndDate = isCurrentMonth || isFutureMonth ? simulatedToday : endDate;

  // Récupérer toutes les dépenses de l'utilisateur jusqu'à la date limite
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        lte: currentBalanceEndDate,
      },
    },
    include: {
      category: true,
      recurrence: true,
    },
  });

  // Calculer le solde actuel (toutes les dépenses jusqu'à la date limite)
  const currentBalance = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  // Récupérer les dépenses du mois sélectionné
  const monthExpenses = await prisma.expense.findMany({
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
  });

  // Vérifier et filtrer les dépenses pour s'assurer qu'elles sont bien dans le mois sélectionné
  const filteredMonthExpenses = monthExpenses.filter(expense => {
    const expenseDate = new Date(expense.date);
    const expenseMonth = expenseDate.getUTCMonth();
    const expenseYear = expenseDate.getUTCFullYear();

    // Vérifier si la transaction est du mois sélectionné
    const isInSelectedMonth =
      expenseMonth === startDate.getUTCMonth() && expenseYear === startDate.getUTCFullYear();

    if (!isInSelectedMonth) {
      console.warn(
        `Dashboard: Transaction hors du mois sélectionné filtrée: ${expense.description}, Date: ${expense.date.toISOString()}, Mois attendu: ${startDate.getUTCMonth() + 1}/${startDate.getUTCFullYear()}, Mois réel: ${expenseMonth + 1}/${expenseYear}`
      );
    }

    return isInSelectedMonth;
  });

  // Calculer le total des dépenses et revenus du mois
  const monthlyExpensesTotal = filteredMonthExpenses
    .filter(expense => expense.amount < 0)
    .reduce((acc, expense) => acc + expense.amount, 0);

  const monthlyIncomeTotal = filteredMonthExpenses
    .filter(expense => expense.amount > 0)
    .reduce((acc, expense) => acc + expense.amount, 0);

  // Initialiser le solde de fin de mois
  let endOfMonthBalance = currentBalance;

  // Si c'est le mois courant ou un mois futur, calculer le solde de fin de mois
  if (isCurrentMonth || isFutureMonth) {
    // Pour les mois futurs ou le mois courant, le solde de fin de mois doit inclure toutes les transactions du mois
    // Vérifier si toutes les transactions du mois sont déjà incluses dans le solde actuel
    if (currentBalanceEndDate.getTime() === endDate.getTime()) {
      // Le solde de fin de mois est déjà correct (égal au solde actuel)
    } else {
      // Sinon, ajouter les transactions manquantes (celles après la date simulée jusqu'à la fin du mois)
      const futureExpenses = filteredMonthExpenses
        .filter(expense => {
          const expenseDate = new Date(expense.date);
          // Comparer les dates pour trouver les transactions après la date simulée
          return isAfter(expenseDate, currentBalanceEndDate);
        })
        .reduce((acc, expense) => acc + expense.amount, 0);
      filteredMonthExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return isAfter(expenseDate, currentBalanceEndDate);
      });

      endOfMonthBalance += futureExpenses;
    }
  }
  // Si c'est un mois passé, vérifier si toutes les transactions du mois sont incluses
  else if (isPastMonth) {
    // Pour un mois passé, le solde de fin de mois devrait inclure toutes les transactions du mois
    // Vérifier si toutes les transactions du mois sont déjà incluses dans le solde actuel
    if (currentBalanceEndDate.getTime() === endDate.getTime()) {
      // Le solde de fin de mois est déjà correct (égal au solde actuel)
    } else {
      // Sinon, ajouter les transactions manquantes
      const missingTransactions = filteredMonthExpenses
        .filter(expense => {
          const expenseDate = new Date(expense.date);
          return isAfter(expenseDate, currentBalanceEndDate) && !isAfter(expenseDate, endDate);
        })
        .reduce((acc, expense) => acc + expense.amount, 0);
      filteredMonthExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return isAfter(expenseDate, currentBalanceEndDate) && !isAfter(expenseDate, endDate);
      });

      endOfMonthBalance += missingTransactions;
    }
  }

  // Récupérer les dépenses récurrentes
  const recurringExpenses = await prisma.expense
    .findMany({
      where: {
        userId,
        isRecurring: true,
      },
      include: {
        recurrence: true,
      },
    })
    .then(expenses =>
      expenses.map(expense => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        frequency: expense.recurrence?.frequency || 'monthly',
        nextDate: expense.recurrence?.startDate || new Date(),
      }))
    );

  // Générer les occurrences futures des dépenses récurrentes
  // Modification: générer pour le mois courant ET les mois futurs
  let generatedFutureAmount = 0;

  // Si c'est le mois courant ou un mois futur, générer les occurrences récurrentes
  if (isCurrentMonth || isFutureMonth) {
    // MODIFICATION: Toujours utiliser le début du mois comme date de départ pour la génération
    // Cela garantit que toutes les dépenses récurrentes du mois sont prises en compte
    const startDateForGeneration = startDate;

    const generatedFutureOccurrences = generateFutureOccurrencesForMonth(
      recurringExpenses,
      startDateForGeneration,
      endDate
    );

    // Pour le mois courant, ne compter que les occurrences qui ne sont pas déjà incluses dans le solde actuel
    if (isCurrentMonth) {
      // Filtrer les occurrences qui sont après aujourd'hui
      const futureOccurrences = generatedFutureOccurrences.filter(
        occurrence => isAfter(occurrence.date, today) && !isSameDay(occurrence.date, today)
      );

      // Calculer le montant total des occurrences futures
      generatedFutureAmount = futureOccurrences.reduce(
        (acc, occurrence) => acc + occurrence.amount,
        0
      );
    } else {
      // Pour un mois futur, compter toutes les occurrences
      generatedFutureAmount = generatedFutureOccurrences.reduce(
        (acc, occurrence) => acc + occurrence.amount,
        0
      );
    }
  }

  // Ajouter les occurrences futures générées au solde de fin de mois
  const endOfMonthBalanceWithRecurring = endOfMonthBalance + generatedFutureAmount;

  // Calculer les dépenses par catégorie
  const categoryExpensesMap = new Map<string, { name: string; amount: number; color: string }>();

  filteredMonthExpenses.forEach(expense => {
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
  startDate: Date,
  endDate: Date
): { description: string; amount: number; date: Date }[] {
  const occurrences: { description: string; amount: number; date: Date }[] = [];

  // Extraire le mois et l'année de la date de fin (qui correspond au mois sélectionné)
  const targetMonth = endDate.getUTCMonth();
  const targetYear = endDate.getUTCFullYear();

  // Créer un ensemble pour suivre les dates des occurrences déjà générées
  const generatedDates = new Set<string>();

  // Créer un ensemble pour suivre les dépenses déjà existantes dans la base de données
  // pour éviter de les compter deux fois
  const existingExpenseDates = new Set<string>();

  // Pour chaque dépense récurrente
  recurringExpenses.forEach(expense => {
    const { id, description, amount, frequency, nextDate } = expense;

    // Vérifier si la date de récurrence est dans le mois cible
    const recurrenceMonth = nextDate.getUTCMonth();
    const recurrenceYear = nextDate.getUTCFullYear();
    const recurrenceDay = nextDate.getUTCDate();

    // Si la date de récurrence est dans un mois futur par rapport au mois cible, l'ignorer
    if (
      recurrenceYear > targetYear ||
      (recurrenceYear === targetYear && recurrenceMonth > targetMonth)
    ) {
      return;
    }

    // Si la date de début est après la fin du mois, ignorer cette dépense
    if (isAfter(nextDate, endDate)) {
      return;
    }

    // Ajouter la date originale à l'ensemble des dates existantes si elle est dans le mois cible
    if (recurrenceMonth === targetMonth && recurrenceYear === targetYear) {
      const originalDateKey = `${id}-${recurrenceYear}-${recurrenceMonth + 1}-${recurrenceDay}`;
      existingExpenseDates.add(originalDateKey);
    }

    // Déterminer la date de la prochaine occurrence
    // Commencer par la date de récurrence originale
    let currentDate = new Date(nextDate);

    // Si la date de récurrence est avant le début du mois cible,
    // trouver la première occurrence qui tombe dans le mois cible
    if (
      recurrenceYear < targetYear ||
      (recurrenceYear === targetYear && recurrenceMonth < targetMonth)
    ) {
      let iterationCount = 0;
      const MAX_ITERATIONS = 1000; // Éviter les boucles infinies

      // Avancer jusqu'à trouver une occurrence dans le mois cible
      while (
        (currentDate.getUTCMonth() !== targetMonth ||
          currentDate.getUTCFullYear() !== targetYear) &&
        iterationCount < MAX_ITERATIONS
      ) {
        iterationCount++;

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
            // Si on ne peut pas avancer, sortir de la boucle
            iterationCount = MAX_ITERATIONS;
            break;
        }
      }

      if (iterationCount >= MAX_ITERATIONS) {
        console.error(`[DEBUG DASHBOARD] Trop d'itérations pour ${description}, ignorée`);
        return;
      }
    }

    // Maintenant, générer toutes les occurrences pour le mois cible
    // en commençant par la première occurrence dans le mois
    let occurrenceCount = 0;
    const MAX_OCCURRENCES = 31; // Maximum d'occurrences par mois

    while (!isAfter(currentDate, endDate) && occurrenceCount < MAX_OCCURRENCES) {
      // Vérifier que l'occurrence est dans le mois cible
      const occurrenceMonth = currentDate.getUTCMonth();
      const occurrenceYear = currentDate.getUTCFullYear();
      const occurrenceDay = currentDate.getUTCDate();

      if (occurrenceMonth !== targetMonth || occurrenceYear !== targetYear) {
        break; // Sortir de la boucle si on dépasse le mois cible
      }

      // Créer une clé unique pour cette occurrence
      const dateKey = `${id}-${occurrenceYear}-${occurrenceMonth + 1}-${occurrenceDay}`;

      // Vérifier si cette date est déjà dans l'ensemble des dates générées
      // ou si elle correspond à une dépense existante dans la base de données
      const isAlreadyGenerated = generatedDates.has(dateKey);
      const isExistingExpense = existingExpenseDates.has(dateKey);

      if (!isAlreadyGenerated && !isExistingExpense) {
        occurrenceCount++;

        // Ajouter l'occurrence
        occurrences.push({
          description,
          amount, // Utiliser le montant original (peut être négatif)
          date: new Date(currentDate),
        });

        // Ajouter cette date à l'ensemble des dates générées
        generatedDates.add(dateKey);
      }

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
          // Si on ne peut pas avancer, sortir de la boucle
          occurrenceCount = MAX_OCCURRENCES;
          break;
      }
    }

    if (occurrenceCount >= MAX_OCCURRENCES) {
      console.warn(`[DEBUG DASHBOARD] Nombre maximum d'occurrences atteint pour ${description}`);
    }
  });

  return occurrences;
}
