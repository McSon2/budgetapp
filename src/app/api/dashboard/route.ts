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
      return NextResponse.json({ error: 'Utilisateur non authentifié' }, { status: 401 });
    }

    // Récupérer la date depuis les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    // Convertir la date si elle est fournie
    const selectedDate = dateParam ? new Date(dateParam) : undefined;

    // Récupérer les données du dashboard
    const dashboardData = await getDashboardData(user.id, selectedDate);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données du dashboard' },
      { status: 500 }
    );
  }
}
