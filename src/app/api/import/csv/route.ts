import { getCurrentUser, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    await requireAuth();

    // Récupérer l'utilisateur courant
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Récupérer les données de la requête
    const { userId, transactions } = await request.json();

    // Vérifier que l'utilisateur est autorisé
    if (userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier que les transactions sont valides
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Aucune transaction valide à importer' }, { status: 400 });
    }

    // Récupérer les catégories existantes
    const existingCategories = await prisma.category.findMany({
      where: { userId: user.id },
    });

    // Créer un map des catégories existantes
    const categoryMap = new Map(
      existingCategories.map(category => [category.name.toLowerCase(), category])
    );

    // Traiter les transactions
    const importedTransactions = [];

    for (const transaction of transactions) {
      try {
        // Déterminer le montant (dépense ou revenu)
        let amount = 0;

        if (transaction.expense) {
          // Convertir la dépense en nombre négatif
          const expenseStr = transaction.expense
            .replace(/\s/g, '')
            .replace(',', '.')
            .replace('€', '')
            .trim();

          if (expenseStr) {
            amount = -Math.abs(parseFloat(expenseStr));
          }
        } else if (transaction.income) {
          // Convertir le revenu en nombre positif
          const incomeStr = transaction.income
            .replace(/\s/g, '')
            .replace(',', '.')
            .replace('€', '')
            .trim();

          if (incomeStr) {
            amount = Math.abs(parseFloat(incomeStr));
          }
        }

        // Ignorer les transactions sans montant
        if (amount === 0) continue;

        // Convertir la date (format JJ/MM/AAAA)
        const [day, month, year] = transaction.date.split('/').map(Number);
        const date = new Date(year, month - 1, day);

        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
          console.warn(`Date invalide ignorée: ${transaction.date}`);
          continue;
        }

        // Gérer la catégorie
        let categoryId = null;

        if (transaction.category) {
          const categoryName = transaction.category.trim();
          const categoryKey = categoryName.toLowerCase();

          // Vérifier si la catégorie existe déjà
          if (categoryMap.has(categoryKey)) {
            categoryId = categoryMap.get(categoryKey)!.id;
          } else {
            // Créer une nouvelle catégorie
            const newCategory = await prisma.category.create({
              data: {
                name: categoryName,
                color: generateRandomColor(),
                userId: user.id,
              },
            });

            categoryId = newCategory.id;
            categoryMap.set(categoryKey, newCategory);
          }
        }

        // Créer la transaction
        const newTransaction = await prisma.expense.create({
          data: {
            date,
            amount,
            description: transaction.description || 'Transaction importée',
            isRecurring: false,
            userId: user.id,
            categoryId,
          },
        });

        importedTransactions.push(newTransaction);
      } catch (error) {
        console.error("Erreur lors du traitement d'une transaction:", error);
        // Continuer avec la transaction suivante
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedTransactions.length,
    });
  } catch (error) {
    console.error("Erreur lors de l'importation CSV:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'importation des transactions" },
      { status: 500 }
    );
  }
}

// Fonction pour générer une couleur aléatoire
function generateRandomColor(): string {
  const colors = [
    '#f44336', // Rouge
    '#e91e63', // Rose
    '#9c27b0', // Violet
    '#673ab7', // Violet foncé
    '#3f51b5', // Indigo
    '#2196f3', // Bleu
    '#03a9f4', // Bleu clair
    '#00bcd4', // Cyan
    '#009688', // Teal
    '#4caf50', // Vert
    '#8bc34a', // Vert clair
    '#cddc39', // Lime
    '#ffeb3b', // Jaune
    '#ffc107', // Ambre
    '#ff9800', // Orange
    '#ff5722', // Orange foncé
    '#795548', // Marron
    '#607d8b', // Bleu gris
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}
