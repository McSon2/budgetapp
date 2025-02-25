'use client';

import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useState } from 'react';
import { toast } from 'sonner';

// Définir les interfaces pour les types
interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  categoryId: string;
}

interface ExpenseFormData {
  description: string;
  amount: number;
  date: string;
  categoryId: string;
}

export default function ExpensesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Mock data for expenses
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      description: 'Groceries',
      amount: 120.5,
      date: '2023-05-15',
      category: 'Food',
      categoryId: '1',
    },
    {
      id: '2',
      description: 'Electricity Bill',
      amount: 85.2,
      date: '2023-05-10',
      category: 'Utilities',
      categoryId: '4',
    },
    {
      id: '3',
      description: 'Netflix Subscription',
      amount: 15.99,
      date: '2023-05-05',
      category: 'Entertainment',
      categoryId: '5',
    },
    {
      id: '4',
      description: 'Rent',
      amount: 800.0,
      date: '2023-05-01',
      category: 'Housing',
      categoryId: '2',
    },
    {
      id: '5',
      description: 'Gas',
      amount: 45.3,
      date: '2023-05-08',
      category: 'Transportation',
      categoryId: '3',
    },
  ]);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
    toast.success('Expense deleted successfully');
  };

  const handleFormSubmit = (data: ExpenseFormData) => {
    if (editingExpense) {
      // Update existing expense
      setExpenses(
        expenses.map(expense =>
          expense.id === editingExpense.id
            ? {
                ...expense,
                description: data.description,
                amount: data.amount,
                date: data.date,
                categoryId: data.categoryId,
                category: getCategoryName(data.categoryId),
              }
            : expense
        )
      );
      toast.success('Expense updated successfully');
    } else {
      // Add new expense
      const newExpense = {
        id: Date.now().toString(),
        description: data.description,
        amount: data.amount,
        date: data.date,
        categoryId: data.categoryId,
        category: getCategoryName(data.categoryId),
      };
      setExpenses([...expenses, newExpense]);
      toast.success('Expense added successfully');
    }
  };

  // Helper function to get category name from ID
  const getCategoryName = (categoryId: string) => {
    const categories = {
      '1': 'Food',
      '2': 'Housing',
      '3': 'Transportation',
      '4': 'Utilities',
      '5': 'Entertainment',
    };
    return categories[categoryId as keyof typeof categories] || 'Uncategorized';
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Expenses</h2>
        <Button onClick={handleAddExpense}>Add Expense</Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input placeholder="Search expenses..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">From Date</label>
              <Input type="date" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <Input type="date" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map(expense => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {expenses.length} of {expenses.length} expenses
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>

      <ExpenseForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        defaultValues={
          editingExpense
            ? {
                description: editingExpense.description,
                amount: editingExpense.amount,
                date: editingExpense.date,
                categoryId: editingExpense.categoryId,
              }
            : undefined
        }
        isEditing={!!editingExpense}
      />
    </AppLayout>
  );
}
