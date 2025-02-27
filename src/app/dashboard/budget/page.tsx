import { BudgetManager } from '@/components/budget/BudgetManager';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { MonthProvider } from '@/components/providers/MonthProvider';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getDashboardData } from '@/lib/services/dashboard-service';

export default async function BudgetPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Get the current user
  const user = await getCurrentUser();

  // Get dashboard data (without selectedMonth for initial server render)
  const dashboardData = await getDashboardData(user?.id || '');

  return (
    <MonthProvider initialData={dashboardData}>
      <div className="container px-4 sm:px-6 mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
        <DashboardHeader
          title="Gestion du Budget"
          backLink="/dashboard"
          backLabel="Retour au tableau de bord"
        />
        <BudgetManager />
      </div>
    </MonthProvider>
  );
}
