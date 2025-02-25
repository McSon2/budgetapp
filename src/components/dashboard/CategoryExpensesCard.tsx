'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDateStore } from '@/lib/store/date-store';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { toast } from 'sonner';

interface CategoryExpense {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface CategoryExpensesCardProps {
  categories?: CategoryExpense[];
  currency?: string;
}

interface Transaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
}

export function CategoryExpensesCard({
  categories: propCategories,
  currency = '€',
}: CategoryExpensesCardProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Record<string, Transaction[]>>(
    {}
  );
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});

  // Utiliser les données du contexte ou les props si fournies
  const dashboardData = useDashboard();
  const { selectedMonth } = useDateStore();
  const categories = propCategories || dashboardData.categoryExpenses;

  // Formater le mois pour l'affichage
  const formattedMonth = format(dashboardData.selectedMonth, 'MMMM yyyy', { locale: fr });

  // Calculer le total des dépenses
  const totalExpenses = categories.reduce((sum, category) => sum + category.amount, 0);

  // Formater le montant pour l'affichage
  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  };

  // Fonction pour récupérer les transactions d'une catégorie
  const fetchCategoryTransactions = async (categoryName: string) => {
    // Si la catégorie est déjà sélectionnée, on la ferme
    if (selectedCategory === categoryName) {
      setSelectedCategory(null);
      return;
    }

    // Marquer cette catégorie comme en cours de chargement
    setLoadingCategories(prev => ({ ...prev, [categoryName]: true }));

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

      // Filtrer les transactions par catégorie
      const filteredTransactions = data.filter(
        (transaction: Transaction) => transaction.category === categoryName
      );

      // Mettre à jour l'état avec les transactions de cette catégorie
      setCategoryTransactions(prev => ({
        ...prev,
        [categoryName]: filteredTransactions,
      }));

      // Définir la catégorie comme sélectionnée
      setSelectedCategory(categoryName);
    } catch (error) {
      console.error('Failed to fetch category transactions:', error);
      toast.error('Impossible de récupérer les transactions de cette catégorie');
    } finally {
      // Marquer cette catégorie comme n'étant plus en cours de chargement
      setLoadingCategories(prev => ({ ...prev, [categoryName]: false }));
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dépenses par catégorie</CardTitle>
        <CardDescription>Répartition de vos dépenses pour {formattedMonth}</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense catégorisée.</p>
        ) : (
          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="space-y-2">
                <div
                  className={`flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer ${selectedCategory === category.name ? 'bg-muted' : ''}`}
                  onClick={() => fetchCategoryTransactions(category.name)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-sm font-medium">
                    <span>{formatAmount(category.amount)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({Math.round((category.amount / totalExpenses) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Afficher les transactions directement sous la catégorie */}
                {selectedCategory === category.name && (
                  <div className="ml-6 mr-2 mb-4 mt-2 rounded-md border overflow-hidden">
                    {loadingCategories[category.name] ? (
                      <div className="flex justify-center items-center h-20">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      </div>
                    ) : categoryTransactions[category.name]?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune transaction trouvée pour cette catégorie.
                      </p>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 bg-muted p-2 text-xs font-medium">
                          <div>Description</div>
                          <div>Date</div>
                          <div className="text-right">Montant</div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {categoryTransactions[category.name]?.map(transaction => (
                            <div
                              key={transaction.id}
                              className="grid grid-cols-3 p-2 text-sm border-t"
                            >
                              <div className="truncate">{transaction.name}</div>
                              <div>{new Date(transaction.date).toLocaleDateString()}</div>
                              <div
                                className={`text-right ${transaction.amount < 0 ? 'text-red-500' : 'text-green-500'}`}
                              >
                                {transaction.amount.toFixed(2)} €
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
