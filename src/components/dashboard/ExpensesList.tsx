'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CheckIcon, ResetIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useEffect, useRef, useState } from 'react';
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
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
                    <PopoverContent
                      className="w-auto p-0 border-2 shadow-lg backdrop-blur-sm bg-background/95 rounded-xl"
                      align="center"
                      side="bottom"
                      avoidCollisions={true}
                      sideOffset={5}
                      alignOffset={0}
                      forceMount
                    >
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
                        <PopoverContent
                          className="w-auto p-0 border-2 shadow-lg backdrop-blur-sm bg-background/95 rounded-xl"
                          align="center"
                          side="bottom"
                          avoidCollisions={true}
                          sideOffset={5}
                          alignOffset={0}
                          forceMount
                        >
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

  // État pour la sélection multiple
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Filtres et recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Récupérer le mois sélectionné depuis le store
  const { selectedMonth } = useDateStore();

  // Récupérer le contexte du dashboard pour pouvoir le rafraîchir
  const dashboardData = useDashboard();
  const refreshDashboard = dashboardData.refreshData;

  // États pour le tri
  const [sortField, setSortField] = useState<'name' | 'category' | 'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Scroll infini au lieu de pagination
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fonction utilitaire pour normaliser une date au début du mois en UTC
  const normalizeToStartOfMonth = (date: Date | string): Date => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const normalized = new Date(dateObj);
    normalized.setUTCDate(1);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  };

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      // S'assurer que selectedMonth est un objet Date valide et normalisé
      const dateToUse = normalizeToStartOfMonth(
        selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth)
      );

      // Obtenir le début du mois sélectionné en UTC
      const start = normalizeToStartOfMonth(dateToUse).toISOString();

      // Pour la date de fin, calculer explicitement le dernier jour du mois
      // et s'assurer qu'elle inclut toute la journée
      const year = dateToUse.getUTCFullYear();
      const month = dateToUse.getUTCMonth();
      // Créer une date pour le premier jour du mois suivant, puis reculer d'un jour
      const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      const end = lastDayOfMonth.toISOString();

      // Ajouter les paramètres de date à la requête
      const response = await fetch(`/api/expenses?startDate=${start}&endDate=${end}`);

      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const data = await response.json();

      // Créer un ensemble pour suivre les IDs des dépenses déjà traitées
      // Cela aidera à éviter les doublons, notamment pour les dépenses récurrentes
      const processedIds = new Set<string>();

      // Vérifier les dates des transactions récupérées
      const filteredData = data.filter((expense: Expense) => {
        // Si l'ID est déjà traité (pour les dépenses générées avec le même ID de base), ignorer
        if (expense.isGenerated && processedIds.has(expense.id.split('-')[0])) {
          console.warn(
            `Filtrage frontend: Doublon détecté pour ${expense.name} (ID: ${expense.id})`
          );
          return false;
        }

        const expenseDate = new Date(expense.date);
        const expenseMonth = expenseDate.getMonth();
        const expenseYear = expenseDate.getFullYear();

        // Vérifier si la transaction est du mois sélectionné
        const isCorrectMonth = expenseMonth === month && expenseYear === year;

        if (!isCorrectMonth) {
          console.warn(
            `Filtrage frontend: Transaction hors du mois sélectionné: ${expense.name}, Date: ${expense.date}, Mois attendu: ${month + 1}/${year}, Mois réel: ${expenseMonth + 1}/${expenseYear}`
          );
          return false;
        }

        // Si c'est une dépense récurrente générée, ajouter son ID de base à l'ensemble des IDs traités
        if (expense.isGenerated) {
          const baseId = expense.id.split('-')[0];
          processedIds.add(baseId);
        }

        return true;
      });

      if (filteredData.length !== data.length) {
        console.warn(
          `Filtrage frontend: ${data.length - filteredData.length} transactions ont été filtrées car elles n'appartiennent pas au mois ${month + 1}/${year}`
        );
      }

      // Utiliser les données filtrées
      setExpenses(filteredData);

      // Réinitialiser le scroll infini
      setDisplayLimit(10);
      setHasMore(filteredData.length > 10);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  // Fonction pour charger plus de transactions
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    // Simuler un délai de chargement pour une meilleure UX
    setTimeout(() => {
      setDisplayLimit(prev => prev + 10);
      setIsLoadingMore(false);

      // Vérifier s'il y a plus de transactions à charger
      const filteredExpenses = getFilteredAndSortedExpenses();
      setHasMore(displayLimit + 10 < filteredExpenses.length);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, displayLimit]);

  // Observer pour le scroll infini
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore]);

  // Réinitialiser le scroll infini lors du changement de filtres
  useEffect(() => {
    setDisplayLimit(10);
    const filteredExpenses = getFilteredAndSortedExpenses();
    setHasMore(filteredExpenses.length > 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, categoryFilter, typeFilter, sortField, sortDirection]);

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
    // Ignorer les transactions générées
    if (id.includes('-') && expenses.find(e => e.id === id)?.isGenerated) {
      toast.error(
        "Les transactions prévisionnelles ne peuvent pas être supprimées directement. Modifiez la transaction récurrente d'origine."
      );
      return;
    }

    const confirmDelete = window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      setExpenses(expenses.filter(expense => expense.id !== id));
      toast.success('Dépense supprimée avec succès');

      // Rafraîchir les données du dashboard
      if (refreshDashboard) {
        refreshDashboard();
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Impossible de supprimer la dépense');
    }
  };

  const handleEdit = (expense: Expense) => {
    // Ignorer les transactions générées
    if (expense.isGenerated) {
      toast.error(
        "Les transactions prévisionnelles ne peuvent pas être modifiées directement. Modifiez la transaction récurrente d'origine."
      );
      return;
    }

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

      // Rafraîchir les données du dashboard
      if (refreshDashboard) {
        refreshDashboard();
      }
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

  // Fonction pour obtenir les dépenses filtrées et triées
  const getFilteredAndSortedExpenses = () => {
    if (!expenses.length) return [];

    // Filtrer d'abord
    const filtered = expenses.filter(expense => {
      // Filtre de recherche
      const matchesSearch =
        searchTerm === '' ||
        expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (expense.category && expense.category.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtre de catégorie
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;

      // Filtre de type (dépense/revenu)
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'expense' && expense.amount < 0) ||
        (typeFilter === 'income' && expense.amount > 0);

      return matchesSearch && matchesCategory && matchesType;
    });

    // Puis trier
    return filtered.sort((a, b) => {
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

  // Obtenir les dépenses filtrées et triées
  const filteredAndSortedExpenses = getFilteredAndSortedExpenses();

  // Obtenir les dépenses à afficher (avec limite pour scroll infini)
  const displayedExpenses = filteredAndSortedExpenses.slice(0, displayLimit);

  // Formater le mois pour l'affichage
  const formattedMonth = format(
    selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth),
    'MMMM yyyy',
    { locale: fr }
  );

  // Fonction pour gérer la sélection d'une transaction
  const handleSelectExpense = (id: string) => {
    setSelectedExpenses(prev => {
      if (prev.includes(id)) {
        return prev.filter(expenseId => expenseId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Fonction pour sélectionner ou désélectionner toutes les transactions
  const handleSelectAll = () => {
    if (selectedExpenses.length === filteredAndSortedExpenses.length) {
      // Si toutes sont sélectionnées, on désélectionne tout
      setSelectedExpenses([]);
    } else {
      // Sinon, on sélectionne toutes les transactions filtrées
      setSelectedExpenses(filteredAndSortedExpenses.map(expense => expense.id));
    }
  };

  // Fonction pour supprimer les transactions sélectionnées
  const handleDeleteSelected = async () => {
    if (selectedExpenses.length === 0) return;

    // Filtrer les IDs pour exclure les transactions générées
    const realExpenseIds = selectedExpenses.filter(id => {
      const expense = expenses.find(e => e.id === id);
      return !expense?.isGenerated;
    });

    if (realExpenseIds.length === 0) {
      toast.error(
        "Les transactions prévisionnelles ne peuvent pas être supprimées directement. Modifiez les transactions récurrentes d'origine."
      );
      return;
    }

    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ${realExpenseIds.length} transaction(s) ?`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/expenses/batch-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: realExpenseIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete expenses');
      }

      // Mettre à jour l'état local
      setExpenses(prev => prev.filter(expense => !selectedExpenses.includes(expense.id)));
      setSelectedExpenses([]);
      setIsSelectionMode(false);
      toast.success(`${realExpenseIds.length} transaction(s) supprimée(s) avec succès`);

      // Rafraîchir les données du dashboard
      if (refreshDashboard) {
        refreshDashboard();
      }
    } catch (error) {
      console.error('Failed to delete expenses:', error);
      toast.error('Impossible de supprimer les transactions');
    }
  };

  // Fonction pour quitter le mode sélection
  const handleCancelSelection = () => {
    setSelectedExpenses([]);
    setIsSelectionMode(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg sm:text-xl">Vos Transactions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Consultez et gérez vos transactions pour {formattedMonth}
            </CardDescription>
          </div>
          {!isSelectionMode ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSelectionMode(true)}
              className="hidden sm:flex"
            >
              Sélection multiple
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelSelection}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedExpenses.length === 0}
              >
                Supprimer ({selectedExpenses.length})
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres et recherche */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher une transaction..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 flex-col sm:flex-row sm:flex-nowrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeFilter}
              onValueChange={(value: 'all' | 'expense' | 'income') => setTypeFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="expense">Dépenses</SelectItem>
                <SelectItem value="income">Revenus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              {/* En-tête du tableau - visible uniquement sur tablette/desktop */}
              <div className="hidden sm:grid sm:grid-cols-12 bg-muted p-3 font-medium text-xs sm:text-sm">
                {isSelectionMode && (
                  <div className="sm:col-span-1 flex items-center">
                    <Checkbox
                      checked={
                        selectedExpenses.length === filteredAndSortedExpenses.length &&
                        filteredAndSortedExpenses.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                      id="select-all"
                      aria-label="Sélectionner toutes les transactions"
                    />
                    <label htmlFor="select-all" className="ml-2 text-xs cursor-pointer">
                      Tout
                    </label>
                  </div>
                )}
                <div
                  className={`${isSelectionMode ? 'sm:col-span-2' : 'sm:col-span-3'} cursor-pointer hover:text-primary flex items-center`}
                  onClick={() => handleSort('name')}
                >
                  Nom <SortIcon field="name" />
                </div>
                <div
                  className="sm:col-span-2 cursor-pointer hover:text-primary flex items-center"
                  onClick={() => handleSort('category')}
                >
                  Catégorie <SortIcon field="category" />
                </div>
                <div
                  className="sm:col-span-2 cursor-pointer hover:text-primary flex items-center"
                  onClick={() => handleSort('date')}
                >
                  Date <SortIcon field="date" />
                </div>
                <div
                  className="sm:col-span-2 cursor-pointer hover:text-primary flex items-center justify-end"
                  onClick={() => handleSort('amount')}
                >
                  Montant <SortIcon field="amount" />
                </div>
                <div
                  className={`${isSelectionMode ? 'sm:col-span-3' : 'sm:col-span-3'} text-right`}
                >
                  Actions
                </div>
              </div>

              {displayedExpenses.length > 0 ? (
                <>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {displayedExpenses.map(expense => (
                      <div
                        key={expense.id}
                        className={`border-t hover:bg-muted/50 transition-colors ${
                          selectedExpenses.includes(expense.id) ? 'bg-primary/5' : ''
                        }`}
                      >
                        {/* Version mobile */}
                        <div className="sm:hidden p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="font-medium flex items-center gap-1">
                              {isSelectionMode && (
                                <Checkbox
                                  checked={selectedExpenses.includes(expense.id)}
                                  onCheckedChange={() => handleSelectExpense(expense.id)}
                                  className="mr-2"
                                  aria-label={`Sélectionner ${expense.name}`}
                                />
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{expense.name}</span>
                                {(expense.isRecurring || expense.isGenerated) && (
                                  <span className="inline-flex ml-1">
                                    <ResetIcon className="h-3 w-3 text-muted-foreground" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`font-medium ${expense.amount < 0 ? 'text-red-500' : 'text-green-500'}`}
                            >
                              {expense.amount.toFixed(2)} €
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-xs text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                            </div>
                            {expense.category ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {expense.category}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Non catégorisé</span>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            {!isSelectionMode ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(expense)}
                                  className="h-8 px-2 text-xs"
                                >
                                  Modifier
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => handleDelete(expense.id)}
                                >
                                  Supprimer
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant={
                                  selectedExpenses.includes(expense.id) ? 'default' : 'outline'
                                }
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => handleSelectExpense(expense.id)}
                              >
                                {selectedExpenses.includes(expense.id) ? (
                                  <>
                                    <CheckIcon className="mr-1 h-4 w-4" /> Sélectionné
                                  </>
                                ) : (
                                  'Sélectionner'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Version desktop */}
                        <div className="hidden sm:grid sm:grid-cols-12 p-3 items-center">
                          {isSelectionMode && (
                            <div className="sm:col-span-1 flex items-center">
                              <Checkbox
                                checked={selectedExpenses.includes(expense.id)}
                                onCheckedChange={() => handleSelectExpense(expense.id)}
                                aria-label={`Sélectionner ${expense.name}`}
                              />
                            </div>
                          )}
                          <div
                            className={`${isSelectionMode ? 'sm:col-span-2' : 'sm:col-span-3'} truncate flex items-center`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{expense.name}</span>
                              {(expense.isRecurring || expense.isGenerated) && (
                                <span className="inline-flex ml-1">
                                  <ResetIcon className="h-3 w-3 text-muted-foreground" />
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            {expense.category ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {expense.category}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Non catégorisé</span>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            {new Date(expense.date).toLocaleDateString()}
                          </div>
                          <div
                            className={`sm:col-span-2 text-right font-medium ${expense.amount < 0 ? 'text-red-500' : 'text-green-500'}`}
                          >
                            {expense.amount.toFixed(2)} €
                          </div>
                          <div
                            className={`${isSelectionMode ? 'sm:col-span-3' : 'sm:col-span-3'} flex justify-end gap-2`}
                          >
                            {!isSelectionMode ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(expense)}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => handleDelete(expense.id)}
                                >
                                  Supprimer
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant={
                                  selectedExpenses.includes(expense.id) ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => handleSelectExpense(expense.id)}
                              >
                                {selectedExpenses.includes(expense.id) ? (
                                  <>
                                    <CheckIcon className="mr-1 h-4 w-4" /> Sélectionné
                                  </>
                                ) : (
                                  'Sélectionner'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Élément observé pour le scroll infini */}
                    {hasMore && (
                      <div ref={observerTarget} className="p-4 flex justify-center items-center">
                        {isLoadingMore ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Faites défiler pour voir plus
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {filteredAndSortedExpenses.length === 0 ? (
                    <>
                      Aucune transaction trouvée pour {formattedMonth}.
                      <br />
                      <span className="text-sm">Ajoutez des transactions pour commencer.</span>
                    </>
                  ) : (
                    <>
                      Aucune transaction ne correspond à vos critères de recherche.
                      <br />
                      <span className="text-sm">Essayez de modifier vos filtres.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Compteur de résultats et bouton de sélection multiple pour mobile */}
            <div className="flex justify-between items-center">
              {filteredAndSortedExpenses.length > 0 && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Affichage de {Math.min(displayLimit, filteredAndSortedExpenses.length)} sur{' '}
                  {filteredAndSortedExpenses.length} transactions
                </div>
              )}

              {!isSelectionMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="sm:hidden"
                >
                  Sélection multiple
                </Button>
              ) : (
                <div className="sm:hidden flex items-center gap-2">
                  {selectedExpenses.length > 0 && (
                    <span className="text-xs">{selectedExpenses.length} sélectionné(s)</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs px-2 h-8"
                  >
                    {selectedExpenses.length === filteredAndSortedExpenses.length &&
                    filteredAndSortedExpenses.length > 0
                      ? 'Désélectionner tout'
                      : 'Tout sélectionner'}
                  </Button>
                </div>
              )}
            </div>
          </>
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
