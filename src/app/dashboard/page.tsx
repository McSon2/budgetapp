import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { CategoryExpensesCard } from '@/components/dashboard/CategoryExpensesCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { RecurringExpensesCard } from '@/components/dashboard/RecurringExpensesCard';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { MonthProvider } from '@/components/providers/MonthProvider';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getDashboardData } from '@/lib/services/dashboard-service';

export default async function DashboardPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Get the current user
  const user = await getCurrentUser();

  // Get dashboard data (without selectedMonth for initial server render)
  const dashboardData = await getDashboardData(user?.id || '');

  return (
    <MonthProvider initialData={dashboardData}>
      <div className="container mx-auto py-6">
        <DashboardHeader title="Tableau de bord" />

        {/* Action buttons */}
        <div className="mb-6">
          <ActionButtons />
        </div>

        {/* Main dashboard grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Balance card */}
          <div className="lg:col-span-1">
            <BalanceCard />
          </div>

          {/* Summary card */}
          <div className="lg:col-span-1">
            <SummaryCard />
          </div>

          {/* Recurring expenses card */}
          <div className="lg:col-span-1">
            <RecurringExpensesCard />
          </div>

          {/* Category expenses card */}
          <div className="lg:col-span-3">
            <CategoryExpensesCard />
          </div>
        </div>
      </div>
    </MonthProvider>
  );
}
