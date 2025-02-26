import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getDashboardData } from '@/lib/services/dashboard-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    await requireAuth();

    // Récupérer l'utilisateur courant
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Récupérer la date sélectionnée depuis les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    // Utiliser la date fournie ou la date actuelle
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    // Récupérer les données du tableau de bord
    const dashboardData = await getDashboardData(user.id, selectedDate);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
