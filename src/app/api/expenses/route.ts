import { getCurrentUser } from '@/lib/auth';
import { addExpense, getExpenses } from '@/lib/services/expenses-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Récupérer les paramètres de date de la requête
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    console.log(`API: Récupération des dépenses pour l'utilisateur ${user.id}`);
    console.log(`API: Dates - du ${startDate} au ${endDate}`);

    // Récupérer les dépenses avec les filtres de date
    const expenses = await getExpenses(user.id, startDate, endDate);
    console.log(`API: ${expenses.length} dépenses trouvées`);

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
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
