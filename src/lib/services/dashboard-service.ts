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

// Fonction utilitaire pour normaliser une date au début du mois
const normalizeToStartOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  normalized.setDate(1);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Fonction utilitaire pour normaliser une date à la fin du mois
const normalizeToEndOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Extraire l'année et le mois
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();

  // Calculer le dernier jour du mois en créant une date au jour 0 du mois suivant
  // (ce qui équivaut au dernier jour du mois actuel)
  const lastDay = new Date(year, month + 1, 0).getDate();

  // Créer une nouvelle date au dernier jour du mois à 23:59:59.999
  const normalized = new Date(year, month, lastDay, 23, 59, 59, 999);

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
  today.setHours(0, 0, 0, 0);

  // Déterminer si le mois sélectionné est le mois courant
  // Utiliser la date réelle pour cette détermination
  const isCurrentMonth =
    today.getFullYear() === startDate.getFullYear() && today.getMonth() === startDate.getMonth();

  // Déterminer si le mois sélectionné est un mois passé
  const isPastMonth =
    startDate.getFullYear() < today.getFullYear() ||
    (startDate.getFullYear() === today.getFullYear() && startDate.getMonth() < today.getMonth());

  // Déterminer si le mois sélectionné est un mois futur
  const isFutureMonth =
    startDate.getFullYear() > today.getFullYear() ||
    (startDate.getFullYear() === today.getFullYear() && startDate.getMonth() > today.getMonth());

  // CORRECTION: Le solde actuel doit toujours être calculé avec toutes les transactions jusqu'à la date actuelle
  // indépendamment du mois sélectionné
  // Définir currentBalanceEndDate comme la fin de la journée actuelle (23:59:59.999)
  // pour inclure toutes les transactions du jour même
  const currentBalanceEndDate = new Date();
  currentBalanceEndDate.setHours(23, 59, 59, 999);

  // Variable pour stocker le montant des récurrences futures
  let generatedFutureAmount = 0;

  // Récupérer toutes les dépenses de l'utilisateur jusqu'à la date actuelle
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

  // Calculer le solde actuel (toutes les dépenses jusqu'à la date actuelle)
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
    const expenseMonth = expenseDate.getMonth();
    const expenseYear = expenseDate.getFullYear();

    // Vérifier si la transaction est du mois sélectionné
    const isInSelectedMonth =
      expenseMonth === startDate.getMonth() && expenseYear === startDate.getFullYear();

    if (!isInSelectedMonth) {
      console.warn(
        `Dashboard: Transaction hors du mois sélectionné filtrée: ${expense.description}, Date: ${expense.date.toISOString()}, Mois attendu: ${startDate.getMonth() + 1}/${startDate.getFullYear()}, Mois réel: ${expenseMonth + 1}/${expenseYear}`
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

  // Si c'est le mois courant, calculer le solde de fin de mois
  if (isCurrentMonth) {
    // Pour le mois courant, le solde de fin de mois doit inclure toutes les transactions du mois
    // qui ne sont pas déjà incluses dans le solde actuel (celles après la date actuelle jusqu'à la fin du mois)
    const futureExpenses = filteredMonthExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        // Comparer les dates pour trouver les transactions après la date actuelle
        return isAfter(expenseDate, currentBalanceEndDate);
      })
      .reduce((acc, expense) => acc + expense.amount, 0);

    console.log(`[DEBUG DASHBOARD] Dépenses futures du mois courant: ${futureExpenses}`);
    console.log(`[DEBUG DASHBOARD] Nombre de dépenses filtrées: ${filteredMonthExpenses.length}`);

    endOfMonthBalance += futureExpenses;
  }
  // Si c'est un mois futur, calculer le solde de fin de mois différemment
  else if (isFutureMonth) {
    // Pour un mois futur, nous devons partir du solde actuel et soustraire toutes les dépenses futures
    // et récurrences jusqu'à la fin du mois sélectionné

    // 1. Partir du solde actuel
    endOfMonthBalance = currentBalance;
    console.log(
      `[DEBUG DASHBOARD] Calcul pour mois futur - Solde actuel de départ: ${endOfMonthBalance}`
    );

    // 2. Récupérer toutes les dépenses non récurrentes entre aujourd'hui et la fin du mois sélectionné
    const futureExpensesUntilEndOfSelectedMonth = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gt: today,
          lte: endDate,
        },
        isRecurring: false,
      },
      include: {
        category: true,
      },
    });

    // Calculer le montant total de ces dépenses
    const futureExpensesAmount = futureExpensesUntilEndOfSelectedMonth.reduce(
      (acc, expense) => acc + expense.amount,
      0
    );

    console.log(
      `[DEBUG DASHBOARD] Dépenses futures jusqu'à la fin du mois sélectionné: ${futureExpensesAmount}`
    );
    console.log(
      `[DEBUG DASHBOARD] Nombre de dépenses futures: ${futureExpensesUntilEndOfSelectedMonth.length}`
    );

    // Ajouter ces dépenses au solde (les montants négatifs seront soustraits)
    endOfMonthBalance += futureExpensesAmount;
    console.log(`[DEBUG DASHBOARD] Solde après dépenses futures: ${endOfMonthBalance}`);

    // 3. Calculer les récurrences pour tous les mois entre aujourd'hui et le mois sélectionné inclus
    // Déterminer le nombre de mois entre aujourd'hui et le mois sélectionné
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const selectedMonth = startDate.getMonth();
    const selectedYear = startDate.getFullYear();

    // Calculer le nombre de mois entre les deux dates
    const monthDiff = (selectedYear - currentYear) * 12 + (selectedMonth - currentMonth);
    console.log(`[DEBUG DASHBOARD] Différence de mois: ${monthDiff}`);

    // Pour chaque mois entre aujourd'hui et le mois sélectionné (inclus)
    let totalRecurringAmount = 0;

    // Simplification: traiter tous les mois entre aujourd'hui et le mois sélectionné
    for (let i = 0; i <= monthDiff; i++) {
      // Calculer le mois à traiter
      const targetDate = new Date(today);
      targetDate.setMonth(targetDate.getMonth() + i);

      const monthStart = normalizeToStartOfMonth(targetDate);
      const monthEnd = normalizeToEndOfMonth(targetDate);

      console.log(
        `[DEBUG DASHBOARD] Traitement du mois ${i}: ${monthStart.toLocaleDateString('fr-FR')} - ${monthEnd.toLocaleDateString('fr-FR')}`
      );

      // Récupérer les récurrences pour ce mois
      const monthRecurringExpenses = await prisma.expense
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

      // Générer les occurrences pour ce mois
      const monthOccurrences = generateFutureOccurrencesForMonth(
        monthRecurringExpenses,
        monthStart,
        monthEnd
      );

      console.log(
        `[DEBUG DASHBOARD] Nombre d'occurrences générées pour le mois ${i}: ${monthOccurrences.length}`
      );

      // Pour le mois courant, ne prendre que les occurrences futures
      let monthRecurringAmount = 0;

      if (i === 0) {
        // Pour le mois courant, ne prendre que les occurrences après aujourd'hui
        monthRecurringAmount = monthOccurrences
          .filter(occurrence => isAfter(occurrence.date, today))
          .reduce((acc, occurrence) => acc + occurrence.amount, 0);
      } else {
        // Pour les mois futurs, prendre toutes les occurrences
        monthRecurringAmount = monthOccurrences.reduce(
          (acc, occurrence) => acc + occurrence.amount,
          0
        );
      }

      console.log(
        `[DEBUG DASHBOARD] Montant des récurrences pour le mois ${i}: ${monthRecurringAmount}`
      );

      // Ajouter au total
      totalRecurringAmount += monthRecurringAmount;
    }

    console.log(`[DEBUG DASHBOARD] Montant total des récurrences futures: ${totalRecurringAmount}`);

    // Ajouter les récurrences au solde (les montants négatifs seront soustraits)
    endOfMonthBalance += totalRecurringAmount;
    console.log(`[DEBUG DASHBOARD] Solde final après récurrences: ${endOfMonthBalance}`);

    // Stocker le montant des récurrences pour l'affichage
    generatedFutureAmount = totalRecurringAmount;
  }
  // Si c'est un mois passé, le solde de fin de mois doit être calculé différemment
  else if (isPastMonth) {
    // Pour un mois passé, le solde de fin de mois doit être le solde actuel moins les transactions
    // qui ont eu lieu après la fin du mois sélectionné jusqu'à aujourd'hui
    const transactionsAfterSelectedMonth = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return isAfter(expenseDate, endDate) && !isAfter(expenseDate, currentBalanceEndDate);
      })
      .reduce((acc, expense) => acc + expense.amount, 0);

    console.log(
      `[DEBUG DASHBOARD] Transactions après le mois sélectionné (passé): ${transactionsAfterSelectedMonth}`
    );

    endOfMonthBalance -= transactionsAfterSelectedMonth;
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

  // Si c'est le mois courant ou un mois futur, générer les occurrences récurrentes
  if (isCurrentMonth) {
    // MODIFICATION: Toujours utiliser le début du mois comme date de départ pour la génération
    // Cela garantit que toutes les dépenses récurrentes du mois sont prises en compte
    const startDateForGeneration = startDate;

    const generatedFutureOccurrences = generateFutureOccurrencesForMonth(
      recurringExpenses,
      startDateForGeneration,
      endDate
    );

    console.log(
      `[DEBUG DASHBOARD] Nombre d'occurrences générées: ${generatedFutureOccurrences.length}`
    );

    // Pour le mois courant, ne compter que les occurrences qui ne sont pas déjà incluses dans le solde actuel
    // Filtrer les occurrences qui sont après aujourd'hui
    const futureOccurrences = generatedFutureOccurrences.filter(
      occurrence => isAfter(occurrence.date, today) && !isSameDay(occurrence.date, today)
    );

    // Calculer le montant total des occurrences futures
    generatedFutureAmount = futureOccurrences.reduce(
      (acc, occurrence) => acc + occurrence.amount,
      0
    );
  } else if (isFutureMonth) {
    // Pour un mois futur, nous devons partir du solde actuel et soustraire toutes les dépenses futures
    // et récurrences jusqu'à la fin du mois sélectionné

    // 1. Partir du solde actuel
    endOfMonthBalance = currentBalance;
    console.log(
      `[DEBUG DASHBOARD] Calcul pour mois futur - Solde actuel de départ: ${endOfMonthBalance}`
    );

    // 2. Récupérer toutes les dépenses non récurrentes entre aujourd'hui et la fin du mois sélectionné
    const futureExpensesUntilEndOfSelectedMonth = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gt: today,
          lte: endDate,
        },
        isRecurring: false,
      },
      include: {
        category: true,
      },
    });

    // Calculer le montant total de ces dépenses
    const futureExpensesAmount = futureExpensesUntilEndOfSelectedMonth.reduce(
      (acc, expense) => acc + expense.amount,
      0
    );

    console.log(
      `[DEBUG DASHBOARD] Dépenses futures jusqu'à la fin du mois sélectionné: ${futureExpensesAmount}`
    );
    console.log(
      `[DEBUG DASHBOARD] Nombre de dépenses futures: ${futureExpensesUntilEndOfSelectedMonth.length}`
    );

    // Soustraire ces dépenses du solde
    endOfMonthBalance += futureExpensesAmount;
    console.log(`[DEBUG DASHBOARD] Solde après dépenses futures: ${endOfMonthBalance}`);

    // 3. Récupérer et calculer les récurrences pour tous les mois entre aujourd'hui et le mois sélectionné
    // Déterminer le nombre de mois entre aujourd'hui et le mois sélectionné
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const selectedMonth = startDate.getMonth();
    const selectedYear = startDate.getFullYear();

    // Calculer le nombre de mois entre les deux dates
    const monthDiff = (selectedYear - currentYear) * 12 + (selectedMonth - currentMonth);
    console.log(`[DEBUG DASHBOARD] Différence de mois: ${monthDiff}`);

    // Pour chaque mois entre aujourd'hui et le mois sélectionné (inclus)
    let totalRecurringAmount = 0;

    for (let i = 0; i <= monthDiff; i++) {
      // Calculer le mois à traiter
      const targetDate = new Date(today);
      targetDate.setMonth(targetDate.getMonth() + i);

      const monthStart = normalizeToStartOfMonth(targetDate);
      const monthEnd = normalizeToEndOfMonth(targetDate);

      console.log(
        `[DEBUG DASHBOARD] Traitement du mois ${i}: ${monthStart.toLocaleDateString('fr-FR')} - ${monthEnd.toLocaleDateString('fr-FR')}`
      );

      // Récupérer les récurrences pour ce mois
      const monthRecurringExpenses = await prisma.expense
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

      // Générer les occurrences pour ce mois
      const monthOccurrences = generateFutureOccurrencesForMonth(
        monthRecurringExpenses,
        monthStart,
        monthEnd
      );

      console.log(
        `[DEBUG DASHBOARD] Nombre d'occurrences générées pour le mois ${i}: ${monthOccurrences.length}`
      );

      // Pour le mois courant, ne prendre que les occurrences futures
      let monthRecurringAmount = 0;

      if (i === 0) {
        // Pour le mois courant, ne prendre que les occurrences après aujourd'hui
        monthRecurringAmount = monthOccurrences
          .filter(occurrence => isAfter(occurrence.date, today))
          .reduce((acc, occurrence) => acc + occurrence.amount, 0);
      } else {
        // Pour les mois futurs, prendre toutes les occurrences
        monthRecurringAmount = monthOccurrences.reduce(
          (acc, occurrence) => acc + occurrence.amount,
          0
        );
      }

      console.log(
        `[DEBUG DASHBOARD] Montant des récurrences pour le mois ${i}: ${monthRecurringAmount}`
      );

      // Ajouter au total
      totalRecurringAmount += monthRecurringAmount;
    }

    console.log(`[DEBUG DASHBOARD] Montant total des récurrences futures: ${totalRecurringAmount}`);

    // Ajouter les récurrences au solde
    endOfMonthBalance += totalRecurringAmount;
    console.log(`[DEBUG DASHBOARD] Solde final après récurrences: ${endOfMonthBalance}`);

    // Stocker le montant des récurrences pour l'affichage
    generatedFutureAmount = totalRecurringAmount;
  }

  // Ajouter les occurrences futures générées au solde de fin de mois
  const endOfMonthBalanceWithRecurring = endOfMonthBalance + generatedFutureAmount;

  console.log(
    `[DEBUG DASHBOARD] Calcul du solde pour ${normalizedDate.toLocaleDateString('fr-FR')}`
  );
  console.log(`[DEBUG DASHBOARD] Solde actuel: ${currentBalance}`);
  console.log(`[DEBUG DASHBOARD] Solde de fin de mois (sans récurrences): ${endOfMonthBalance}`);
  console.log(`[DEBUG DASHBOARD] Montant des récurrences futures: ${generatedFutureAmount}`);
  console.log(
    `[DEBUG DASHBOARD] Solde de fin de mois (avec récurrences): ${endOfMonthBalanceWithRecurring}`
  );
  console.log(
    `[DEBUG DASHBOARD] Type de mois: ${isCurrentMonth ? 'Courant' : isFutureMonth ? 'Futur' : 'Passé'}`
  );

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

  // CORRECTION: Pour les mois futurs, utiliser directement endOfMonthBalance comme solde final
  // car il inclut déjà les récurrences futures
  const finalEndOfMonthBalance = isFutureMonth ? endOfMonthBalance : endOfMonthBalanceWithRecurring;

  return {
    currentBalance,
    endOfMonthBalance: finalEndOfMonthBalance,
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
  const targetMonth = endDate.getMonth();
  const targetYear = endDate.getFullYear();

  console.log(
    `[DEBUG RECURRING] Génération des dépenses récurrentes pour le mois ${targetMonth + 1}/${targetYear}`
  );
  console.log(
    `[DEBUG RECURRING] Période: du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')}`
  );
  console.log(
    `[DEBUG RECURRING] Nombre de dépenses récurrentes à traiter: ${recurringExpenses.length}`
  );

  // Créer un ensemble pour suivre les dates des occurrences déjà générées
  const generatedDates = new Set<string>();

  // Créer un ensemble pour suivre les dépenses déjà existantes dans la base de données
  // pour éviter de les compter deux fois
  const existingExpenseDates = new Set<string>();

  // Pour chaque dépense récurrente
  recurringExpenses.forEach(expense => {
    const { id, description, amount, frequency, nextDate } = expense;

    // Vérifier si la date de récurrence est dans le mois cible
    const recurrenceMonth = nextDate.getMonth();
    const recurrenceYear = nextDate.getFullYear();
    const recurrenceDay = nextDate.getDate();

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
        (currentDate.getMonth() !== targetMonth || currentDate.getFullYear() !== targetYear) &&
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
      const occurrenceMonth = currentDate.getMonth();
      const occurrenceYear = currentDate.getFullYear();
      const occurrenceDay = currentDate.getDate();

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
