import { getCurrentUser } from '@/lib/auth';
import { addExpense, getExpenses } from '@/lib/services/expenses-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    // Vérifier le format des dates
    const startDateObj = new Date(startDate);
    const endDateObj = endDate ? new Date(endDate) : new Date(startDate);

    // Vérifier que les dates sont valides
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('API: Dates invalides:', startDate, endDate);
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Vérifier que la date de début est avant la date de fin
    if (startDateObj > endDateObj) {
      console.error('API: La date de début est après la date de fin:', startDate, endDate);
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    // Vérifier que les dates correspondent au même mois
    if (
      startDateObj.getFullYear() !== endDateObj.getFullYear() ||
      startDateObj.getMonth() !== endDateObj.getMonth()
    ) {
      console.warn('API: Les dates ne correspondent pas au même mois:', startDate, endDate);
    }

    // Extraire le mois et l'année de la date de début (utiliser les méthodes locales)
    const requestedMonth = startDateObj.getMonth() + 1; // 1-12 (janvier = 1)
    const requestedYear = startDateObj.getFullYear();

    console.log(`API: Récupération des dépenses pour le mois ${requestedMonth}/${requestedYear}`);

    // Utiliser la nouvelle signature de getExpenses qui prend le mois comme paramètre
    const result = await getExpenses(userId, startDate);

    return NextResponse.json(result.expenses);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validation basique
    if (!data.name || data.amount === undefined || !data.date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Préparer les données pour l'ajout de la dépense
    const expenseData = {
      name: data.name,
      amount: parseFloat(data.amount),
      date: data.date,
      category: data.category,
      isRecurring: data.isRecurring || false,
      recurrence: data.recurrence,
    };

    const expense = await addExpense(user.id, expenseData);

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
