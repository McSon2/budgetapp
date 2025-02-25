'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(1, 'La description est requise'),
  amount: z.coerce.number().min(0.01, 'Le montant doit être supérieur à 0'),
  type: z.enum(['expense', 'income']),
  date: z.date(),
  category: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.string().optional(),
  recurrenceEndDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddExpensePopover() {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      amount: 0,
      type: 'expense',
      date: new Date(),
      category: undefined,
      isRecurring: false,
      recurrenceFrequency: 'monthly',
      recurrenceEndDate: undefined,
    },
  });

  // Observer pour les champs dépendants
  const isRecurring = form.watch('isRecurring');
  const transactionType = form.watch('type');

  useEffect(() => {
    // Récupérer les catégories
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
      }
    }

    fetchCategories();
  }, []);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      // Préparer les données pour la dépense
      const expenseData = {
        name: values.name,
        // Convertir le montant en négatif si c'est une dépense
        amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
        date: values.date.toISOString(),
        category: values.category,
        // Ajouter les informations de récurrence si nécessaire
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

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        // Réinitialiser le formulaire et fermer le popover
        form.reset();
        setOpen(false);

        // Afficher un toast de succès
        toast.success(values.type === 'expense' ? 'Dépense ajoutée' : 'Revenu ajouté', {
          description:
            values.type === 'expense'
              ? 'Votre dépense a été ajoutée avec succès'
              : 'Votre revenu a été ajouté avec succès',
        });

        // Recharger la page pour afficher la nouvelle dépense
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast.error('Erreur', {
          description: errorData.error || "Une erreur est survenue lors de l'ajout",
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
      toast.error('Erreur', {
        description: "Une erreur est survenue lors de l'ajout",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="lg" className="w-full">
          <PlusIcon className="h-4 w-4 mr-2" />
          Ajouter une transaction
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96" align="center">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Nouvelle transaction</h4>
            <p className="text-sm text-muted-foreground">
              Ajoutez une nouvelle dépense ou un revenu à votre budget
            </p>
          </div>
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
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value === 0 ? '' : field.value}
                        onChange={e => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
                      />
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Ajout en cours...'
                  : transactionType === 'expense'
                    ? 'Ajouter la dépense'
                    : 'Ajouter le revenu'}
              </Button>
            </form>
          </Form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
