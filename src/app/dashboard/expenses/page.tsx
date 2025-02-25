import { PageHeader } from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireAuth } from '@/lib/auth';

export default async function ExpensesPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Mock data for expenses
  const expenses = [
    { id: '1', name: 'Groceries', amount: 120.5, date: '2023-06-01', category: 'Food' },
    { id: '2', name: 'Electricity Bill', amount: 85.2, date: '2023-06-05', category: 'Utilities' },
    {
      id: '3',
      name: 'Netflix Subscription',
      amount: 15.99,
      date: '2023-06-10',
      category: 'Entertainment',
    },
    { id: '4', name: 'Gas', amount: 45.0, date: '2023-06-15', category: 'Transportation' },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader title="Expenses" backLink="/dashboard" />

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Expense List</TabsTrigger>
          <TabsTrigger value="add">Add Expense</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Expenses</CardTitle>
              <CardDescription>View and manage your recent expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-5 bg-muted p-4 font-medium">
                  <div>Name</div>
                  <div>Category</div>
                  <div>Date</div>
                  <div className="text-right">Amount</div>
                  <div className="text-right">Actions</div>
                </div>
                {expenses.map(expense => (
                  <div key={expense.id} className="grid grid-cols-5 p-4 border-t">
                    <div>{expense.name}</div>
                    <div>{expense.category}</div>
                    <div>{new Date(expense.date).toLocaleDateString()}</div>
                    <div className="text-right">${expense.amount.toFixed(2)}</div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    No expenses found. Add some expenses to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Expense</CardTitle>
              <CardDescription>Enter the details of your new expense</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Expense Name</Label>
                    <Input id="name" placeholder="e.g., Groceries" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="housing">Housing</SelectItem>
                        <SelectItem value="transportation">Transportation</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input id="notes" placeholder="Additional details about this expense" />
                </div>
                <Button type="submit" className="w-full">
                  Add Expense
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
