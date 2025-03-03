import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { mapDbExpenseToExpense } from '@/lib/services/expenses/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: 'ID de la transaction requis' }, { status: 400 });
    }

    // Rechercher d'abord une transaction avec cet ID exact
    let expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        category: true,
        recurrence: true,
      },
    });

    if (expense) {
      return NextResponse.json(mapDbExpenseToExpense(expense));
    }

    // Si aucune transaction n'est trouvée avec l'ID exact, rechercher parmi les transactions récurrentes
    // dont l'ID a été utilisé pour générer des transactions (ID commençant par l'ID demandé)
    const generatedExpenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
        OR: [
          // Cas 1: Transaction originale dont l'ID fait partie des ID générés
          { id: { startsWith: id } },
          // Cas 2: Transactions générées dont l'ID commence par l'ID demandé
          { id: { contains: `${id}-` } },
        ],
      },
      include: {
        category: true,
        recurrence: true,
      },
      orderBy: {
        date: 'asc',
      },
      take: 1, // Ne prendre que la première trouvée
    });

    if (generatedExpenses.length > 0) {
      expense = generatedExpenses[0];
      return NextResponse.json(mapDbExpenseToExpense(expense));
    }

    // Si toujours aucune transaction trouvée, renvoyer une erreur 404
    return NextResponse.json({ error: 'Transaction récurrente non trouvée' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching recurring parent expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
