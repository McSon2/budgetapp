import { ActionButtons } from '@/components/dashboard/ActionButtons';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { CategoryExpensesCard } from '@/components/dashboard/CategoryExpensesCard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ExpensesList } from '@/components/dashboard/expenses';
import { RecurringExpensesCard } from '@/components/dashboard/RecurringExpensesCard';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { MonthProvider } from '@/components/providers/MonthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <div className="container px-4 sm:px-6 mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
        <DashboardHeader title="Tableau de bord" />

        {/* Action buttons */}
        <div className="mb-4 sm:mb-6">
          <ActionButtons />
        </div>

        {/* Main dashboard content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 overflow-x-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm">
              Catégories
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Financial summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <BalanceCard />
              <SummaryCard />
              <RecurringExpensesCard />
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <ExpensesList />
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <CategoryExpensesCard />
          </TabsContent>
        </Tabs>
      </div>
    </MonthProvider>
  );
}
