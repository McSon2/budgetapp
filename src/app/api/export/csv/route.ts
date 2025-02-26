import { getCurrentUser, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    await requireAuth();

    // Récupérer l'utilisateur courant
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Récupérer les paramètres de la requête
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Vérifier que l'utilisateur est autorisé
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier que les dates sont valides
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Les dates de début et de fin sont requises' },
        { status: 400 }
      );
    }

    // Préparer les conditions de filtrage
    const whereCondition: {
      userId: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
    } = { userId: user.id };

    // Ajouter le filtrage par date
    whereCondition.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };

    // Récupérer les dépenses depuis la base de données
    const expenses = await prisma.expense.findMany({
      where: whereCondition,
      include: { category: true, recurrence: true },
      orderBy: { date: 'asc' },
    });

    // Générer le contenu CSV
    let csvContent =
      'Date,Heure,Catégorie,Sous-catégorie,Nom,Remarques,Dépense,Rentrée,Récurrent,Fréquence,Date de fin\n';

    for (const expense of expenses) {
      // Formater la date (JJ/MM/AAAA)
      const formattedDate = format(expense.date, 'dd/MM/yyyy', { locale: fr });

      // Formater l'heure (HH:MM)
      const formattedTime = format(expense.date, 'HH:mm', { locale: fr });

      // Déterminer si c'est une dépense ou un revenu
      let expenseAmount = '';
      let incomeAmount = '';

      if (expense.amount < 0) {
        // C'est une dépense (montant négatif)
        expenseAmount = Math.abs(expense.amount).toFixed(2).replace('.', ',');
      } else {
        // C'est un revenu (montant positif)
        incomeAmount = expense.amount.toFixed(2).replace('.', ',');
      }

      // Informations de récurrence
      const isRecurrent = expense.isRecurring ? 'Oui' : 'Non';
      const frequency = expense.recurrence?.frequency || '';
      const endDate = expense.recurrence?.endDate
        ? format(expense.recurrence.endDate, 'dd/MM/yyyy', { locale: fr })
        : '';

      // Échapper les champs qui pourraient contenir des virgules
      const escapeCsvField = (field: string) => {
        if (field && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      // Toujours encadrer les montants avec des guillemets pour éviter les problèmes avec les virgules
      const safeExpenseAmount = expenseAmount ? `"${expenseAmount}"` : '';
      const safeIncomeAmount = incomeAmount ? `"${incomeAmount}"` : '';

      // Ajouter la ligne au CSV
      csvContent +=
        [
          formattedDate,
          formattedTime,
          escapeCsvField(expense.category?.name || ''),
          '', // Sous-catégorie (vide pour l'instant)
          escapeCsvField(expense.description),
          '', // Remarques (vide pour l'instant)
          safeExpenseAmount,
          safeIncomeAmount,
          isRecurrent,
          escapeCsvField(frequency),
          endDate,
        ].join(',') + '\n';
    }

    // Créer la réponse avec le contenu CSV
    const response = new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="transactions_${format(
          new Date(startDate),
          'dd-MM-yyyy'
        )}_${format(new Date(endDate), 'dd-MM-yyyy')}.csv"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Erreur lors de l'exportation CSV:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'exportation des transactions" },
      { status: 500 }
    );
  }
}
