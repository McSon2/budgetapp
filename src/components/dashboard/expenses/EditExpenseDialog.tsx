'use client';

import { Button } from '@/components/ui/button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { EditFormValues, UpdatedExpense, editFormSchema } from './types';

export function EditExpenseDialog({
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
                  <FormControl>
                    <DateTimePicker
                      value={field.value}
                      onChange={field.onChange}
                      granularity="day"
                      locale={fr}
                      displayFormat={{
                        hour24: 'PPP',
                      }}
                      placeholder="Sélectionner une date"
                    />
                  </FormControl>
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
                      <FormControl>
                        <DateTimePicker
                          value={field.value}
                          onChange={field.onChange}
                          granularity="day"
                          locale={fr}
                          displayFormat={{
                            hour24: 'PPP',
                          }}
                          placeholder="Sélectionner une date de fin"
                          disabled={false}
                        />
                      </FormControl>
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
