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
  console.log(`[DEBUG DASHBOARD] Récupération des données pour l'utilisateur: ${userId}`);
  console.log(`[DEBUG DASHBOARD] Date sélectionnée: ${selectedDate}`);

  // Normaliser la date sélectionnée au début du mois en UTC
  const normalizedDate = selectedDate
    ? normalizeToStartOfMonth(selectedDate)
    : normalizeToStartOfMonth(new Date());

  console.log(`[DEBUG DASHBOARD] Date normalisée: ${normalizedDate.toISOString()}`);

  // Calculer le début et la fin du mois sélectionné en UTC
  const startDate = normalizeToStartOfMonth(normalizedDate);
  const endDate = normalizeToEndOfMonth(normalizedDate);

  console.log(`[DEBUG DASHBOARD] Début du mois: ${startDate.toISOString()}`);
  console.log(`[DEBUG DASHBOARD] Fin du mois: ${endDate.toISOString()}`);

  // Obtenir la date actuelle en UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log(`[DEBUG DASHBOARD] Date actuelle: ${today.toISOString()}`);

  // Déterminer si le mois sélectionné est le mois courant
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

  console.log(`[DEBUG DASHBOARD] Mois courant: ${isCurrentMonth}`);
  console.log(`[DEBUG DASHBOARD] Mois passé: ${isPastMonth}`);
  console.log(`[DEBUG DASHBOARD] Mois futur: ${isFutureMonth}`);

  // Date limite pour le calcul du solde actuel
  // Si c'est le mois courant, on utilise aujourd'hui
  // Si c'est un mois passé, on utilise la fin du mois
  // Si c'est un mois futur, on utilise le début du mois
  const currentBalanceEndDate = isCurrentMonth ? today : isPastMonth ? endDate : startDate;

  console.log(
    `[DEBUG DASHBOARD] Date limite pour le solde actuel: ${currentBalanceEndDate.toISOString()}`
  );

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

  console.log(`[DEBUG DASHBOARD] Nombre de dépenses jusqu'à la date limite: ${expenses.length}`);

  // Calculer le solde actuel (toutes les dépenses jusqu'à la date limite)
  const currentBalance = expenses.reduce((acc, expense) => acc + expense.amount, 0);

  console.log(`[DEBUG DASHBOARD] Solde actuel: ${currentBalance}`);

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

  console.log(`[DEBUG DASHBOARD] Nombre de dépenses du mois: ${monthExpenses.length}`);

  // Calculer le total des dépenses et revenus du mois
  const monthlyExpensesTotal = monthExpenses
    .filter(expense => expense.amount < 0)
    .reduce((acc, expense) => acc + expense.amount, 0);

  const monthlyIncomeTotal = monthExpenses
    .filter(expense => expense.amount > 0)
    .reduce((acc, expense) => acc + expense.amount, 0);

  console.log(`[DEBUG DASHBOARD] Total des dépenses du mois: ${monthlyExpensesTotal}`);
  console.log(`[DEBUG DASHBOARD] Total des revenus du mois: ${monthlyIncomeTotal}`);

  // Initialiser le solde de fin de mois
  let endOfMonthBalance = currentBalance;

  console.log(`[DEBUG DASHBOARD] Solde de fin de mois initial: ${endOfMonthBalance}`);

  // Si c'est le mois courant, ajouter les dépenses futures du mois (après aujourd'hui)
  if (isCurrentMonth) {
    const futureExpenses = monthExpenses
      .filter(
        expense =>
          isAfter(new Date(expense.date), today) && !isSameDay(new Date(expense.date), today)
      )
      .reduce((acc, expense) => acc + expense.amount, 0);

    console.log(`[DEBUG DASHBOARD] Dépenses futures du mois courant: ${futureExpenses}`);
    endOfMonthBalance += futureExpenses;
    console.log(`[DEBUG DASHBOARD] Solde après ajout des dépenses futures: ${endOfMonthBalance}`);
  }
  // Si c'est un mois futur, ajouter toutes les dépenses du mois au solde actuel
  else if (isFutureMonth) {
    const monthTotal = monthExpenses.reduce((acc, expense) => acc + expense.amount, 0);
    console.log(`[DEBUG DASHBOARD] Total des dépenses du mois futur: ${monthTotal}`);
    endOfMonthBalance += monthTotal;
    console.log(
      `[DEBUG DASHBOARD] Solde après ajout des dépenses du mois futur: ${endOfMonthBalance}`
    );
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

  console.log(`[DEBUG DASHBOARD] Nombre de dépenses récurrentes: ${recurringExpenses.length}`);

  // Générer les occurrences futures des dépenses récurrentes
  // Modification: générer pour le mois courant ET les mois futurs
  let generatedFutureAmount = 0;

  // Si c'est le mois courant ou un mois futur, générer les occurrences récurrentes
  if (isCurrentMonth || isFutureMonth) {
    console.log(
      `[DEBUG DASHBOARD] Génération des occurrences récurrentes pour ${isCurrentMonth ? 'le mois courant' : 'un mois futur'}`
    );

    // MODIFICATION: Toujours utiliser le début du mois comme date de départ pour la génération
    // Cela garantit que toutes les dépenses récurrentes du mois sont prises en compte
    const startDateForGeneration = startDate;

    console.log(
      `[DEBUG DASHBOARD] Date de départ pour la génération: ${startDateForGeneration.toISOString()}`
    );

    const generatedFutureOccurrences = generateFutureOccurrencesForMonth(
      recurringExpenses,
      startDateForGeneration,
      endDate
    );

    console.log(
      `[DEBUG DASHBOARD] Nombre d'occurrences générées: ${generatedFutureOccurrences.length}`
    );

    // Afficher les détails de chaque occurrence générée
    generatedFutureOccurrences.forEach((occurrence, index) => {
      console.log(
        `[DEBUG DASHBOARD] Occurrence #${index + 1}: ${occurrence.description}, ${occurrence.amount}€, ${occurrence.date.toISOString()}`
      );
    });

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

      console.log(
        `[DEBUG DASHBOARD] Montant des occurrences futures (après aujourd'hui): ${generatedFutureAmount}`
      );
    } else {
      // Pour un mois futur, compter toutes les occurrences
      generatedFutureAmount = generatedFutureOccurrences.reduce(
        (acc, occurrence) => acc + occurrence.amount,
        0
      );

      console.log(
        `[DEBUG DASHBOARD] Montant total des occurrences générées: ${generatedFutureAmount}`
      );
    }
  } else {
    console.log(`[DEBUG DASHBOARD] Pas de génération d'occurrences récurrentes pour un mois passé`);
  }

  // Ajouter les occurrences futures générées au solde de fin de mois
  const endOfMonthBalanceWithRecurring = endOfMonthBalance + generatedFutureAmount;

  console.log(
    `[DEBUG DASHBOARD] Solde de fin de mois avec récurrences: ${endOfMonthBalanceWithRecurring}`
  );
  console.log(`[DEBUG DASHBOARD] Différence due aux récurrences: ${generatedFutureAmount}`);

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
  startDate: Date,
  endDate: Date
): { description: string; amount: number; date: Date }[] {
  const occurrences: { description: string; amount: number; date: Date }[] = [];

  // Extraire le mois et l'année de la date de fin (qui correspond au mois sélectionné)
  const targetMonth = endDate.getUTCMonth();
  const targetYear = endDate.getUTCFullYear();

  console.log(
    `[DEBUG DASHBOARD] Génération des occurrences pour le mois ${targetMonth + 1}/${targetYear}`
  );
  console.log(
    `[DEBUG DASHBOARD] Date de début: ${startDate.toISOString()}, Date de fin: ${endDate.toISOString()}`
  );
  console.log(`[DEBUG DASHBOARD] Nombre de dépenses récurrentes: ${recurringExpenses.length}`);

  // Créer un ensemble pour suivre les dates des occurrences déjà générées
  const generatedDates = new Set<string>();

  // Créer un ensemble pour suivre les dépenses déjà existantes dans la base de données
  // pour éviter de les compter deux fois
  const existingExpenseDates = new Set<string>();

  // Pour chaque dépense récurrente
  recurringExpenses.forEach(expense => {
    const { id, description, amount, frequency, nextDate } = expense;

    console.log(
      `[DEBUG DASHBOARD] Traitement de la dépense: ${description}, montant: ${amount}, fréquence: ${frequency}`
    );
    console.log(`[DEBUG DASHBOARD] Date de début de récurrence: ${nextDate.toISOString()}`);

    // Vérifier si la date de récurrence est dans le mois cible
    const recurrenceMonth = nextDate.getUTCMonth();
    const recurrenceYear = nextDate.getUTCFullYear();
    const recurrenceDay = nextDate.getUTCDate();

    console.log(
      `[DEBUG DASHBOARD] Mois de récurrence: ${recurrenceMonth + 1}/${recurrenceYear}, Mois cible: ${targetMonth + 1}/${targetYear}`
    );

    // Si la date de récurrence est dans un mois futur par rapport au mois cible, l'ignorer
    if (
      recurrenceYear > targetYear ||
      (recurrenceYear === targetYear && recurrenceMonth > targetMonth)
    ) {
      console.log(
        `[DEBUG DASHBOARD] La date de récurrence est dans un mois futur par rapport au mois cible, ignorée`
      );
      return;
    }

    // Si la date de début est après la fin du mois, ignorer cette dépense
    if (isAfter(nextDate, endDate)) {
      console.log(`[DEBUG DASHBOARD] La date de début est après la fin du mois, ignorée`);
      return;
    }

    // Ajouter la date originale à l'ensemble des dates existantes si elle est dans le mois cible
    if (recurrenceMonth === targetMonth && recurrenceYear === targetYear) {
      const originalDateKey = `${id}-${recurrenceYear}-${recurrenceMonth + 1}-${recurrenceDay}`;
      existingExpenseDates.add(originalDateKey);
      console.log(`[DEBUG DASHBOARD] Date originale ajoutée aux existantes: ${originalDateKey}`);
    }

    // Déterminer la date de la prochaine occurrence
    // Commencer par la date de récurrence originale
    let currentDate = new Date(nextDate);
    console.log(`[DEBUG DASHBOARD] Date de départ pour le calcul: ${currentDate.toISOString()}`);

    // Si la date de récurrence est avant le début du mois cible,
    // trouver la première occurrence qui tombe dans le mois cible
    if (
      recurrenceYear < targetYear ||
      (recurrenceYear === targetYear && recurrenceMonth < targetMonth)
    ) {
      console.log(
        `[DEBUG DASHBOARD] La date de récurrence est avant le mois cible, calcul de la première occurrence dans le mois cible`
      );

      let iterationCount = 0;
      const MAX_ITERATIONS = 1000; // Éviter les boucles infinies

      // Avancer jusqu'à trouver une occurrence dans le mois cible
      while (
        (currentDate.getUTCMonth() !== targetMonth ||
          currentDate.getUTCFullYear() !== targetYear) &&
        iterationCount < MAX_ITERATIONS
      ) {
        iterationCount++;
        const beforeDate = new Date(currentDate);

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

        console.log(
          `[DEBUG DASHBOARD] Itération ${iterationCount}: ${beforeDate.toISOString()} -> ${currentDate.toISOString()}`
        );
      }

      if (iterationCount >= MAX_ITERATIONS) {
        console.error(`[DEBUG DASHBOARD] Trop d'itérations pour ${description}, ignorée`);
        return;
      }

      console.log(
        `[DEBUG DASHBOARD] Première occurrence dans le mois cible: ${currentDate.toISOString()}`
      );
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
        console.log(
          `[DEBUG DASHBOARD] L'occurrence est hors du mois cible, arrêt de la génération`
        );
        break; // Sortir de la boucle si on dépasse le mois cible
      }

      // Créer une clé unique pour cette occurrence
      const dateKey = `${id}-${occurrenceYear}-${occurrenceMonth + 1}-${occurrenceDay}`;
      console.log(`[DEBUG DASHBOARD] Vérification de l'occurrence: ${dateKey}`);

      // Vérifier si cette date est déjà dans l'ensemble des dates générées
      // ou si elle correspond à une dépense existante dans la base de données
      const isAlreadyGenerated = generatedDates.has(dateKey);
      const isExistingExpense = existingExpenseDates.has(dateKey);

      if (!isAlreadyGenerated && !isExistingExpense) {
        occurrenceCount++;
        console.log(
          `[DEBUG DASHBOARD] Ajout de l'occurrence #${occurrenceCount}: ${description}, ${amount}€, ${currentDate.toISOString()}`
        );

        // Ajouter l'occurrence
        occurrences.push({
          description,
          amount, // Utiliser le montant original (peut être négatif)
          date: new Date(currentDate),
        });

        // Ajouter cette date à l'ensemble des dates générées
        generatedDates.add(dateKey);
      } else {
        if (isExistingExpense) {
          console.log(`[DEBUG DASHBOARD] Occurrence existante dans la base, ignorée: ${dateKey}`);
        } else {
          console.log(`[DEBUG DASHBOARD] Occurrence déjà générée, ignorée: ${dateKey}`);
        }
      }

      // Calculer la prochaine occurrence
      const previousDate = new Date(currentDate);

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

      console.log(
        `[DEBUG DASHBOARD] Passage à l'occurrence suivante: ${previousDate.toISOString()} -> ${currentDate.toISOString()}`
      );
    }

    if (occurrenceCount >= MAX_OCCURRENCES) {
      console.warn(`[DEBUG DASHBOARD] Nombre maximum d'occurrences atteint pour ${description}`);
    }

    console.log(
      `[DEBUG DASHBOARD] Nombre d'occurrences générées pour ${description}: ${occurrenceCount}`
    );
  });

  // Calculer le montant total des occurrences générées
  const totalAmount = occurrences.reduce((acc, occurrence) => acc + occurrence.amount, 0);
  console.log(`[DEBUG DASHBOARD] Nombre total d'occurrences générées: ${occurrences.length}`);
  console.log(`[DEBUG DASHBOARD] Montant total des occurrences générées: ${totalAmount}€`);

  return occurrences;
}
