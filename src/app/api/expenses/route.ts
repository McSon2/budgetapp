import { getCurrentUser } from '@/lib/auth';
import { addExpense, getExpenses } from '@/lib/services/expenses-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const expenses = await getExpenses(user.id);
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
