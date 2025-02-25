import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireAuth } from '@/lib/auth';

export default async function BudgetPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Mock data for budget categories
  const budgetCategories = [
    { id: '1', name: 'Food', allocated: 500, spent: 320.75, remaining: 179.25 },
    { id: '2', name: 'Housing', allocated: 1200, spent: 1200, remaining: 0 },
    { id: '3', name: 'Transportation', allocated: 300, spent: 145.5, remaining: 154.5 },
    { id: '4', name: 'Utilities', allocated: 200, spent: 185.2, remaining: 14.8 },
    { id: '5', name: 'Entertainment', allocated: 150, spent: 95.99, remaining: 54.01 },
    { id: '6', name: 'Healthcare', allocated: 100, spent: 0, remaining: 100 },
  ];

  // Calculate totals
  const totalAllocated = budgetCategories.reduce((sum, category) => sum + category.allocated, 0);
  const totalSpent = budgetCategories.reduce((sum, category) => sum + category.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="container mx-auto py-6">
      <PageHeader title="Budget" backLink="/dashboard" />

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Budget</CardTitle>
            <CardDescription>Monthly allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAllocated.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Spent</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Remaining</CardTitle>
            <CardDescription>Available funds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRemaining.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Budget Overview</TabsTrigger>
          <TabsTrigger value="manage">Manage Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Categories</CardTitle>
              <CardDescription>Track your spending against budget allocations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {budgetCategories.map(category => {
                  const percentSpent = (category.spent / category.allocated) * 100;

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${category.spent.toFixed(2)} / ${category.allocated.toFixed(2)}
                        </div>
                      </div>
                      <Progress value={percentSpent} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <div className={percentSpent >= 100 ? 'text-red-500' : 'text-green-500'}>
                          ${category.remaining.toFixed(2)} remaining
                        </div>
                        <div>{Math.min(100, percentSpent).toFixed(0)}% used</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Budget Allocations</CardTitle>
              <CardDescription>Set or update your monthly budget limits</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                {budgetCategories.map(category => (
                  <div
                    key={category.id}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`budget-${category.id}`}>{category.name}</Label>
                      <div className="text-sm text-muted-foreground">
                        Currently spent: ${category.spent.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`budget-${category.id}`}
                        type="number"
                        step="0.01"
                        defaultValue={category.allocated}
                      />
                      <Button type="button" variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                  </div>
                ))}
                <Button type="submit" className="w-full">
                  Save All Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
