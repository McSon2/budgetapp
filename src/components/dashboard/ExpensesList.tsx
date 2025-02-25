'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Category } from '@/lib/services/categories-service';
import { Expense } from '@/lib/services/expenses-service';
import { useDateStore } from '@/lib/store/date-store';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Type pour les données mises à jour d'une dépense
interface UpdatedExpense {
  name: string;
  amount: number;
  date: string;
  category?: string;
  isRecurring: boolean;
  recurrence?: {
    frequency: string;
    startDate: string;
    endDate?: string;
  };
}

// Schéma de validation pour le formulaire d'édition
const editFormSchema = z.object({
  name: z.string().min(1, 'La description est requise'),
  amount: z.coerce.number().min(0.01, 'Le montant doit être supérieur à 0'),
  type: z.enum(['expense', 'income']),
  date: z.date(),
  category: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.string().optional(),
  recurrenceEndDate: z.date().optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

// Composant pour éditer une dépense
function EditExpenseDialog({
  expense,
  categories,
  onSave,
  onCancel,
}: {
  expense: Expense;
  categories: Category[];
  onSave: (id: string, updatedExpense: UpdatedExpense) => Promise<void>;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Déterminer si c'est une dépense ou un revenu
  const expenseType = expense.amount < 0 ? 'expense' : 'income';
  const absoluteAmount = Math.abs(expense.amount);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: expense.name,
      amount: absoluteAmount,
      type: expenseType,
      date: new Date(expense.date),
      category: expense.category,
      isRecurring: expense.isRecurring || false,
      recurrenceFrequency: expense.recurrenceFrequency || 'monthly',
      recurrenceEndDate: expense.recurrenceEndDate
        ? new Date(expense.recurrenceEndDate)
        : undefined,
    },
  });

  const isRecurring = form.watch('isRecurring');

  async function onSubmit(values: EditFormValues) {
    setIsSubmitting(true);
    try {
      // Préparer les données pour la mise à jour
      const updatedExpense: UpdatedExpense = {
        name: values.name,
        amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
        date: values.date.toISOString(),
        category: values.category,
        isRecurring: values.isRecurring,
        recurrence: values.isRecurring
          ? {
              frequency: values.recurrenceFrequency || 'monthly',
              startDate: values.date.toISOString(),
              endDate: values.recurrenceEndDate
                ? values.recurrenceEndDate.toISOString()
                : undefined,
            }
          : undefined,
      };

      await onSave(expense.id, updatedExpense);
      setOpen(false);
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error('Erreur', {
        description: 'Une erreur est survenue lors de la modification',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Fermer le dialogue et annuler l'édition
  const handleClose = () => {
    setOpen(false);
    onCancel();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        setOpen(isOpen);
        if (!isOpen) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier la transaction</DialogTitle>
          <DialogDescription>Modifiez les détails de votre transaction</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Type de transaction</FormLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'expense' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => field.onChange('expense')}
                    >
                      Dépense
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'income' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => field.onChange('income')}
                    >
                      Revenu
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Description de la transaction" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: fr })
                          ) : (
                            <span>Sélectionner une date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Aucune catégorie disponible
                        </SelectItem>
                      ) : (
                        categories.map(category => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: category.color }}
                              ></div>
                              {category.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {categories.length === 0 ? (
                      <span className="text-yellow-500">
                        Aucune catégorie disponible. Utilisez le bouton &quot;Gérer les
                        catégories&quot; pour en ajouter.
                      </span>
                    ) : (
                      'Sélectionnez une catégorie pour cette transaction'
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Transaction récurrente</FormLabel>
                    <FormDescription>
                      Activez cette option si cette transaction se répète régulièrement
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRecurring && (
              <>
                <FormField
                  control={form.control}
                  name="recurrenceFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fréquence</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une fréquence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Quotidienne</SelectItem>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                          <SelectItem value="monthly">Mensuelle</SelectItem>
                          <SelectItem value="yearly">Annuelle</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurrenceEndDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de fin (optionnelle)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: fr })
                              ) : (
                                <span>Sélectionner une date de fin</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <div className="p-3 border-b">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">Sélection rapide</h4>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div>
                                <label className="text-sm font-medium mb-1 block">Année</label>
                                <Select
                                  onValueChange={value => {
                                    const newDate = new Date(field.value || new Date());
                                    newDate.setFullYear(parseInt(value));
                                    field.onChange(newDate);
                                  }}
                                  defaultValue={
                                    field.value
                                      ? field.value.getFullYear().toString()
                                      : new Date().getFullYear().toString()
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Année" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 10 }, (_, i) => {
                                      const year = new Date().getFullYear() + i;
                                      return (
                                        <SelectItem key={year} value={year.toString()}>
                                          {year}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Mois</label>
                                <Select
                                  onValueChange={value => {
                                    const newDate = new Date(field.value || new Date());
                                    newDate.setMonth(parseInt(value));
                                    field.onChange(newDate);
                                  }}
                                  defaultValue={
                                    field.value
                                      ? field.value.getMonth().toString()
                                      : new Date().getMonth().toString()
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Mois" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => {
                                      const date = new Date(2000, i, 1);
                                      return (
                                        <SelectItem key={i} value={i.toString()}>
                                          {format(date, 'MMMM', { locale: fr })}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-1 block">Jour</label>
                                <Select
                                  onValueChange={value => {
                                    const newDate = new Date(field.value || new Date());
                                    newDate.setDate(parseInt(value));
                                    field.onChange(newDate);
                                  }}
                                  defaultValue={
                                    field.value
                                      ? field.value.getDate().toString()
                                      : new Date().getDate().toString()
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Jour" />
                                  </SelectTrigger>
                                  <SelectContent className="h-[200px]">
                                    {Array.from({ length: 31 }, (_, i) => {
                                      const day = i + 1;
                                      return (
                                        <SelectItem key={day} value={day.toString()}>
                                          {day}
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date();
                                  const futureDate = new Date(today);
                                  futureDate.setFullYear(today.getFullYear() + 1);
                                  field.onChange(futureDate);
                                }}
                              >
                                + 1 an
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date();
                                  const futureDate = new Date(today);
                                  futureDate.setFullYear(today.getFullYear() + 2);
                                  field.onChange(futureDate);
                                }}
                              >
                                + 2 ans
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date();
                                  const futureDate = new Date(today);
                                  futureDate.setFullYear(today.getFullYear() + 5);
                                  field.onChange(futureDate);
                                }}
                              >
                                + 5 ans
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const today = new Date();
                                  const futureDate = new Date(today);
                                  futureDate.setMonth(today.getMonth() + 6);
                                  field.onChange(futureDate);
                                }}
                              >
                                + 6 mois
                              </Button>
                            </div>
                          </div>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={date => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Laissez vide pour une récurrence sans fin</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Modification en cours...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpensesList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Récupérer le mois sélectionné depuis le store
  const { selectedMonth } = useDateStore();

  // États pour le tri
  const [sortField, setSortField] = useState<'name' | 'category' | 'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      // S'assurer que selectedMonth est un objet Date valide
      const dateToUse = selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth);

      // Obtenir le début et la fin du mois sélectionné
      const start = startOfMonth(dateToUse).toISOString();
      const end = endOfMonth(dateToUse).toISOString();

      // Ajouter les paramètres de date à la requête
      const response = await fetch(`/api/expenses?startDate=${start}&endDate=${end}`);

      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Impossible de récupérer les dépenses');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      setExpenses(expenses.filter(expense => expense.id !== id));
      toast.success('Dépense supprimée avec succès');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Impossible de supprimer la dépense');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleSaveEdit = async (id: string, updatedExpense: UpdatedExpense) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedExpense),
      });

      if (!response.ok) {
        throw new Error('Failed to update expense');
      }

      const updatedData = await response.json();

      // Mettre à jour la liste des dépenses
      setExpenses(expenses.map(expense => (expense.id === id ? updatedData : expense)));

      setEditingExpense(null);
      toast.success('Transaction modifiée avec succès');

      // Rafraîchir la liste des dépenses pour s'assurer que tout est à jour
      fetchExpenses();
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error('Impossible de modifier la transaction');
    }
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
  };

  // Fonction pour gérer le tri
  const handleSort = (field: 'name' | 'category' | 'date' | 'amount') => {
    // Si on clique sur la même colonne, on inverse la direction
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Sinon, on trie par la nouvelle colonne dans l'ordre ascendant par défaut
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Fonction pour obtenir les dépenses triées
  const getSortedExpenses = () => {
    if (!expenses.length) return [];

    return [...expenses].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          // Gérer le cas où la catégorie est undefined
          const categoryA = a.category || '';
          const categoryB = b.category || '';
          comparison = categoryA.localeCompare(categoryB);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Icône de tri
  const SortIcon = ({ field }: { field: 'name' | 'category' | 'date' | 'amount' }) => {
    if (field !== sortField) return null;

    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Charger les dépenses et catégories au chargement initial
  useEffect(() => {
    fetchCategories();
  }, []);

  // Recharger les dépenses lorsque le mois sélectionné change
  useEffect(() => {
    fetchExpenses();
  }, [selectedMonth, fetchExpenses]);

  // Obtenir les dépenses triées
  const sortedExpenses = getSortedExpenses();

  // Formater le mois pour l'affichage
  const formattedMonth = format(
    selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth),
    'MMMM yyyy',
    { locale: fr }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vos Transactions</CardTitle>
        <CardDescription>Consultez et gérez vos transactions pour {formattedMonth}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <div className="grid grid-cols-5 bg-muted p-4 font-medium">
              <div
                className="cursor-pointer hover:text-primary flex items-center"
                onClick={() => handleSort('name')}
              >
                Nom <SortIcon field="name" />
              </div>
              <div
                className="cursor-pointer hover:text-primary flex items-center"
                onClick={() => handleSort('category')}
              >
                Catégorie <SortIcon field="category" />
              </div>
              <div
                className="cursor-pointer hover:text-primary flex items-center"
                onClick={() => handleSort('date')}
              >
                Date <SortIcon field="date" />
              </div>
              <div
                className="cursor-pointer hover:text-primary flex items-center justify-end"
                onClick={() => handleSort('amount')}
              >
                Montant <SortIcon field="amount" />
              </div>
              <div className="text-right">Actions</div>
            </div>
            {sortedExpenses.map(expense => (
              <div key={expense.id} className="grid grid-cols-5 p-4 border-t">
                <div>{expense.name}</div>
                <div>{expense.category}</div>
                <div>{new Date(expense.date).toLocaleDateString()}</div>
                <div
                  className={`text-right ${expense.amount < 0 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {expense.amount.toFixed(2)} €
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(expense)}>
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => handleDelete(expense.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                Aucune transaction trouvée pour {formattedMonth}. Ajoutez des transactions pour
                commencer.
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Dialogue d'édition */}
      {editingExpense && (
        <EditExpenseDialog
          expense={editingExpense}
          categories={categories}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </Card>
  );
}
