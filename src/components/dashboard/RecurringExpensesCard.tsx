'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UpdateIcon } from '@radix-ui/react-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
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
  expenses: initialExpenses,
  currency = '€',
}: RecurringExpensesCardProps) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>(initialExpenses || []);
  const [isLoading, setIsLoading] = useState(!initialExpenses);

  // Fonction pour formater la date en français
  const formatDate = (date: Date | string, expenseFrequency?: string) => {
    try {
      // Si c'est une chaîne ISO, utiliser parseISO pour éviter les problèmes de fuseau horaire
      const dateObj = typeof date === 'string' ? parseISO(date) : date;
      const today = new Date();

      // Pour les dépenses annuelles, vérifier si la date est déjà passée cette année
      if (expenseFrequency === 'yearly') {
        // Créer une date avec l'année actuelle mais le même mois et jour que la date de dépense
        const thisYearDate = new Date(today.getFullYear(), dateObj.getMonth(), dateObj.getDate());

        // Si cette date est déjà passée, la prochaine occurrence sera l'année prochaine
        if (thisYearDate < today) {
          // Afficher avec l'année suivante
          return format(
            new Date(today.getFullYear() + 1, dateObj.getMonth(), dateObj.getDate()),
            'd MMM yyyy',
            { locale: fr }
          );
        }

        // Sinon, afficher avec l'année actuelle
        return format(thisYearDate, 'd MMM yyyy', { locale: fr });
      }

      // Pour les autres dépenses, afficher l'année si elle est différente de l'année en cours
      if (dateObj.getFullYear() !== today.getFullYear()) {
        return format(dateObj, 'd MMM yyyy', { locale: fr });
      }

      // Sinon, afficher juste le jour et le mois
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
          const response = await fetch('/api/expenses/recurring');
          if (response.ok) {
            const data = await response.json();
            setExpenses(data);
          } else {
            toast.error('Erreur lors de la récupération des dépenses récurrentes');
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des dépenses récurrentes:', error);
          toast.error('Erreur lors de la récupération des dépenses récurrentes');
        } finally {
          setIsLoading(false);
        }
      };

      fetchRecurringExpenses();
    }
  }, [initialExpenses]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dépenses récurrentes</CardTitle>
        <CardDescription>Vos paiements réguliers à venir</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense récurrente.</p>
        ) : (
          <div className="space-y-4">
            {expenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="flex items-center justify-between border-b pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{expense.description}</span>
                    <Badge variant="outline" className="text-xs">
                      <UpdateIcon className="h-3 w-3 mr-1" />
                      {translateFrequency(expense.frequency)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prochain: {formatDate(expense.nextDate, expense.frequency)}
                  </p>
                </div>
                <span className="font-medium text-destructive">
                  -{expense.amount.toLocaleString('fr-FR')} {currency}
                </span>
              </div>
            ))}

            {expenses.length > 5 && (
              <p className="text-xs text-center text-muted-foreground">
                +{expenses.length - 5} autres dépenses récurrentes
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
