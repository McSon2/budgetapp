import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { CategoryExpensesCard } from '@/components/dashboard/CategoryExpensesCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { RecurringExpensesCard } from '@/components/dashboard/RecurringExpensesCard';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getDashboardData } from '@/lib/services/dashboard-service';

export default async function DashboardPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Get the current user
  const user = await getCurrentUser();

  // Get dashboard data
  const dashboardData = await getDashboardData(user?.id || '');

  return (
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
          <BalanceCard
            currentBalance={dashboardData.currentBalance}
            endOfMonthBalance={dashboardData.endOfMonthBalance}
          />
        </div>

        {/* Summary card */}
        <div className="lg:col-span-1">
          <SummaryCard income={dashboardData.income} expenses={dashboardData.expenses} />
        </div>

        {/* Recurring expenses card */}
        <div className="lg:col-span-1">
          <RecurringExpensesCard expenses={dashboardData.recurringExpenses} />
        </div>

        {/* Category expenses card */}
        <div className="lg:col-span-3">
          <CategoryExpensesCard categories={dashboardData.categoryExpenses} />
        </div>
      </div>
    </div>
  );
}
