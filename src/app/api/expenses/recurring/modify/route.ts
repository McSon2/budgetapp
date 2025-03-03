import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeDate } from '@/lib/services/expenses/utils';
import { addDays, addMonths, startOfMonth } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

// Types pour la modification des dépenses récurrentes
type ModificationType = 'current' | 'future' | 'all';

interface ModifyRecurringExpenseRequest {
  recurringExpenseId: string;
  modificationType: ModificationType;
  updatedExpense: {
    name: string;
    amount: number;
    date: string;
    category?: string;
    isRecurring?: boolean;
    recurrence?: {
      frequency: string;
      startDate: string;
      endDate?: string;
    };
  };
}

// Type pour la dépense originale récupérée de la base de données
interface OriginalExpense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  isRecurring: boolean;
  userId: string;
  categoryId: string | null;
  recurrenceId: string | null;
  recurrence?: {
    id: string;
    frequency: string;
    interval: number;
    startDate: Date;
    endDate: Date | null;
  };
  category?: {
    id: string;
    name: string;
  };
}

// Type pour la dépense mise à jour
interface UpdatedExpenseData {
  name: string;
  amount: number;
  date: string;
  category?: string;
  isRecurring?: boolean;
  recurrence?: {
    frequency: string;
    startDate: string;
    endDate?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = (await request.json()) as ModifyRecurringExpenseRequest;
    const { recurringExpenseId, modificationType, updatedExpense } = data;

    // Récupérer la dépense récurrente originale
    const originalExpense = await prisma.expense.findUnique({
      where: {
        id: recurringExpenseId,
        userId: user.id,
      },
      include: {
        category: true,
        recurrence: true,
      },
    });

    if (!originalExpense) {
      console.error(
        `API: Dépense récurrente non trouvée. ID: ${recurringExpenseId}, UserID: ${user.id}`
      );
      return NextResponse.json({ error: 'Dépense récurrente non trouvée' }, { status: 404 });
    }

    if (!originalExpense.recurrenceId) {
      console.error(
        `API: La dépense ${recurringExpenseId} n'est pas récurrente ou n'a pas de récurrence associée`
      );
      return NextResponse.json(
        { error: "La dépense n'est pas récurrente ou n'a pas de récurrence associée" },
        { status: 400 }
      );
    }

    // Trouver ou créer la catégorie
    let categoryId: string | null = null;

    if (updatedExpense.category) {
      const category = await prisma.category.findFirst({
        where: {
          name: updatedExpense.category,
          userId: user.id,
        },
      });

      if (category) {
        categoryId = category.id;
      } else {
        // Créer une nouvelle catégorie si elle n'existe pas
        const newCategory = await prisma.category.create({
          data: {
            name: updatedExpense.category,
            userId: user.id,
          },
        });
        categoryId = newCategory.id;
      }
    }

    // Gérer la modification selon le type demandé
    switch (modificationType) {
      case 'current': // Modifier uniquement la récurrence du mois en cours
        return await handleCurrentMonthModification(
          originalExpense as OriginalExpense,
          updatedExpense,
          user.id,
          categoryId
        );
      case 'future': // Modifier les récurrences à partir du mois en cours
        return await handleFutureMonthsModification(
          originalExpense as OriginalExpense,
          updatedExpense,
          user.id,
          categoryId
        );
      case 'all': // Modifier toutes les récurrences (passées et futures)
        return await handleAllModification(
          originalExpense as OriginalExpense,
          updatedExpense,
          categoryId
        );
      default:
        return NextResponse.json({ error: 'Type de modification non valide' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erreur lors de la modification de la dépense récurrente:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

/**
 * Gère la modification uniquement pour le mois en cours
 */
async function handleCurrentMonthModification(
  originalExpense: OriginalExpense,
  updatedExpense: UpdatedExpenseData,
  userId: string,
  categoryId: string | null
) {
  const currentDate = new Date();

  // Définir la date de fin de la transaction récurrente au mois précédent
  const endOfLastMonth = addDays(startOfMonth(currentDate), -1);

  // 1. Mettre à jour la récurrence originale pour se terminer le mois précédent
  await prisma.recurrence.update({
    where: { id: originalExpense.recurrenceId! },
    data: {
      endDate: endOfLastMonth,
    },
  });

  // 2. Créer une transaction non récurrente pour le mois en cours
  const currentMonthExpense = await prisma.expense.create({
    data: {
      description: updatedExpense.name,
      amount: updatedExpense.amount,
      date: normalizeDate(updatedExpense.date),
      isRecurring: false,
      userId,
      categoryId,
    },
    include: { category: true, recurrence: true },
  });

  // 3. Créer une nouvelle récurrence à partir du mois suivant
  const firstDayOfNextMonth = startOfMonth(addMonths(currentDate, 1));

  const newRecurrence = await prisma.recurrence.create({
    data: {
      frequency: originalExpense.recurrence?.frequency || 'monthly',
      interval: originalExpense.recurrence?.interval || 1,
      startDate: firstDayOfNextMonth,
      endDate: originalExpense.recurrence?.endDate,
    },
  });

  // 4. Créer une nouvelle dépense récurrente à partir du mois suivant
  const futureRecurringExpense = await prisma.expense.create({
    data: {
      description: originalExpense.description,
      amount: originalExpense.amount,
      date: firstDayOfNextMonth,
      isRecurring: true,
      userId,
      categoryId: originalExpense.categoryId,
      recurrenceId: newRecurrence.id,
    },
    include: { category: true, recurrence: true },
  });

  return NextResponse.json({
    message: 'Dépense récurrente modifiée pour le mois en cours uniquement',
    currentMonthExpense,
    futureRecurringExpense,
  });
}

/**
 * Gère la modification pour le mois en cours et tous les mois suivants
 */
async function handleFutureMonthsModification(
  originalExpense: OriginalExpense,
  updatedExpense: UpdatedExpenseData,
  userId: string,
  categoryId: string | null
) {
  const currentDate = new Date();

  // Définir la date de fin de la transaction récurrente au mois précédent
  const endOfLastMonth = addDays(startOfMonth(currentDate), -1);

  // 1. Mettre à jour la récurrence originale pour se terminer le mois précédent
  await prisma.recurrence.update({
    where: { id: originalExpense.recurrenceId! },
    data: {
      endDate: endOfLastMonth,
    },
  });

  // 2. Créer une nouvelle récurrence à partir du mois en cours
  const newRecurrence = await prisma.recurrence.create({
    data: {
      frequency:
        updatedExpense.recurrence?.frequency || originalExpense.recurrence?.frequency || 'monthly',
      interval: originalExpense.recurrence?.interval || 1,
      startDate: normalizeDate(updatedExpense.date),
      endDate: updatedExpense.recurrence?.endDate
        ? normalizeDate(updatedExpense.recurrence.endDate)
        : originalExpense.recurrence?.endDate,
    },
  });

  // 3. Créer une nouvelle dépense récurrente à partir du mois en cours
  const newRecurringExpense = await prisma.expense.create({
    data: {
      description: updatedExpense.name,
      amount: updatedExpense.amount,
      date: normalizeDate(updatedExpense.date),
      isRecurring: true,
      userId,
      categoryId,
      recurrenceId: newRecurrence.id,
    },
    include: { category: true, recurrence: true },
  });

  return NextResponse.json({
    message: 'Dépense récurrente modifiée pour le mois en cours et les mois suivants',
    newRecurringExpense,
  });
}

/**
 * Gère la modification de toutes les récurrences (passées et futures)
 */
async function handleAllModification(
  originalExpense: OriginalExpense,
  updatedExpense: UpdatedExpenseData,
  categoryId: string | null
) {
  // Mettre à jour la récurrence
  await prisma.recurrence.update({
    where: { id: originalExpense.recurrenceId! },
    data: {
      frequency:
        updatedExpense.recurrence?.frequency || originalExpense.recurrence?.frequency || 'monthly',
      startDate: updatedExpense.recurrence?.startDate
        ? normalizeDate(updatedExpense.recurrence.startDate)
        : originalExpense.recurrence?.startDate,
      endDate: updatedExpense.recurrence?.endDate
        ? normalizeDate(updatedExpense.recurrence.endDate)
        : originalExpense.recurrence?.endDate,
    },
  });

  // Mettre à jour la dépense elle-même
  const updatedRecurringExpense = await prisma.expense.update({
    where: { id: originalExpense.id },
    data: {
      description: updatedExpense.name,
      amount: updatedExpense.amount,
      date: updatedExpense.date ? normalizeDate(updatedExpense.date) : originalExpense.date,
      categoryId: categoryId !== null ? categoryId : undefined,
    },
    include: { category: true, recurrence: true },
  });

  return NextResponse.json({
    message: 'Toutes les occurrences de la dépense récurrente ont été modifiées',
    updatedRecurringExpense,
  });
}
