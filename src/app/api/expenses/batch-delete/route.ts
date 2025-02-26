import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer les IDs des transactions à supprimer
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs de transactions invalides' }, { status: 400 });
    }

    // Vérifier que toutes les transactions appartiennent à l'utilisateur
    const userExpenses = await prisma.expense.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      select: { id: true },
    });

    const userExpenseIds = userExpenses.map(expense => expense.id);

    // Si certaines transactions n'appartiennent pas à l'utilisateur, on les filtre
    const validIds = ids.filter(id => userExpenseIds.includes(id));

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'Aucune transaction valide à supprimer' }, { status: 400 });
    }

    // Supprimer les transactions
    const result = await prisma.expense.deleteMany({
      where: {
        id: { in: validIds },
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} transaction(s) supprimée(s)`,
      count: result.count,
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des transactions:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des transactions' },
      { status: 500 }
    );
  }
}
