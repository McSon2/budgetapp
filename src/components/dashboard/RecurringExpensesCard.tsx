'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, UpdateIcon } from '@radix-ui/react-icons';
import { addMonths, format, isBefore, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  nextDate: Date | string;
}

interface RecurringExpensesCardProps {
  expenses?: RecurringExpense[];
  currency?: string;
}

export function RecurringExpensesCard({
  expenses: propExpenses,
  currency = '€',
}: RecurringExpensesCardProps = {}) {
  // Utiliser les données du contexte ou les props si fournies
  const dashboardData = useDashboard();
  const initialExpenses = propExpenses || dashboardData.recurringExpenses;

  const [expenses, setExpenses] = useState<RecurringExpense[]>(initialExpenses || []);
  const [isLoading, setIsLoading] = useState(!initialExpenses);

  // Calculer le montant total des dépenses récurrentes
  const totalRecurringAmount = useMemo(() => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  }, [expenses]);

  // Mettre à jour les dépenses lorsque les données du dashboard changent
  useEffect(() => {
    if (dashboardData.recurringExpenses && !propExpenses) {
      setExpenses(dashboardData.recurringExpenses);
    }
  }, [dashboardData.recurringExpenses, propExpenses]);

  // Fonction pour calculer la prochaine date d'échéance en fonction de la fréquence
  const getNextOccurrence = (date: Date, frequency: string): Date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextDate = new Date(date);

    // Si la date est dans le passé, calculer la prochaine occurrence
    if (isBefore(nextDate, today)) {
      switch (frequency) {
        case 'daily':
          // Pour les dépenses quotidiennes, la prochaine occurrence est demain
          nextDate = new Date(today);
          nextDate.setDate(today.getDate() + 1);
          break;

        case 'weekly':
          // Pour les dépenses hebdomadaires, ajouter des semaines jusqu'à ce que la date soit future
          while (isBefore(nextDate, today)) {
            nextDate.setDate(nextDate.getDate() + 7);
          }
          break;

        case 'monthly':
          // Pour les dépenses mensuelles, conserver le même jour du mois mais avancer les mois
          let monthsToAdd = 1;

          // Calculer combien de mois il faut ajouter pour que la date soit dans le futur
          while (isBefore(addMonths(date, monthsToAdd), today)) {
            monthsToAdd++;
          }

          nextDate = addMonths(date, monthsToAdd);
          break;

        case 'yearly':
          // Pour les dépenses annuelles, ajouter des années jusqu'à ce que la date soit future
          while (isBefore(nextDate, today)) {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
          }
          break;
      }
    }

    return nextDate;
  };

  // Fonction pour formater la date en français
  const formatDate = (date: Date | string, expenseFrequency?: string): string => {
    try {
      // Si c'est une chaîne ISO, utiliser parseISO pour éviter les problèmes de fuseau horaire
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const today = new Date();

      // Si une fréquence est spécifiée, calculer la prochaine occurrence
      if (expenseFrequency) {
        const nextOccurrence = getNextOccurrence(dateObj, expenseFrequency);

        // Afficher l'année si elle est différente de l'année en cours
        if (nextOccurrence.getFullYear() !== today.getFullYear()) {
          return format(nextOccurrence, 'd MMM yyyy', { locale: fr });
        }

        // Sinon, afficher juste le jour et le mois
        return format(nextOccurrence, 'd MMM', { locale: fr });
      }

      // Si pas de fréquence spécifiée, comportement par défaut
      if (dateObj.getFullYear() !== today.getFullYear()) {
        return format(dateObj, 'd MMM yyyy', { locale: fr });
      }

      return format(dateObj, 'd MMM', { locale: fr });
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error, date);
      // En cas d'erreur, retourner une valeur par défaut
      return 'Date inconnue';
    }
  };

  // Fonction pour traduire la fréquence en français
  const translateFrequency = (frequency: string) => {
    const translations: Record<string, string> = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      yearly: 'Annuel',
    };
    return translations[frequency] || frequency;
  };

  // Récupérer les dépenses récurrentes si elles ne sont pas fournies en props
  useEffect(() => {
    if (!initialExpenses) {
      const fetchRecurringExpenses = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/recurring-expenses');
          if (!response.ok) {
            throw new Error('Failed to fetch recurring expenses');
          }
          const data = await response.json();
          setExpenses(data);
        } catch (error) {
          console.error('Failed to fetch recurring expenses:', error);
          toast.error('Impossible de récupérer les dépenses récurrentes');
        } finally {
          setIsLoading(false);
        }
      };

      fetchRecurringExpenses();
    }
  }, [initialExpenses]);

  // Trier les dépenses par date (les plus proches en premier)
  const sortedExpenses = [...expenses].sort((a, b) => {
    // Convertir les dates en objets Date
    const dateA = typeof a.nextDate === 'string' ? parseISO(a.nextDate) : a.nextDate;
    const dateB = typeof b.nextDate === 'string' ? parseISO(b.nextDate) : b.nextDate;

    // Calculer les prochaines occurrences
    const nextA = getNextOccurrence(dateA, a.frequency);
    const nextB = getNextOccurrence(dateB, b.frequency);

    // Trier par date
    return nextA.getTime() - nextB.getTime();
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Dépenses récurrentes</CardTitle>
            <CardDescription>Vos paiements réguliers à venir</CardDescription>
          </div>
          <UpdateIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        {!isLoading && expenses.length > 0 && (
          <div className="mt-2 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium flex justify-between items-center">
              <span>Total mensuel estimé:</span>
              <span className="text-destructive font-bold">
                {totalRecurringAmount.toLocaleString('fr-FR')} {currency}
              </span>
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <CalendarIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune dépense récurrente.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez des dépenses récurrentes pour suivre vos paiements réguliers.
            </p>
          </div>
        ) : (
          <div
            className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {sortedExpenses.map(expense => (
              <div
                key={expense.id}
                className="flex flex-col p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{expense.description}</span>
                    <Badge variant="outline" className="text-xs">
                      <UpdateIcon className="h-3 w-3 mr-1" />
                      {translateFrequency(expense.frequency)}
                    </Badge>
                  </div>
                  <span className="font-medium text-destructive">
                    -{expense.amount.toLocaleString('fr-FR')} {currency}
                  </span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  <span>Prochaine échéance: {formatDate(expense.nextDate, expense.frequency)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
