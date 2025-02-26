'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Category } from '@/lib/services/categories-service';
import { useDateStore } from '@/lib/store/date-store';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useState } from 'react';
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

// Fonction utilitaire pour normaliser une date au début du mois en UTC
const normalizeToStartOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  normalized.setUTCDate(1);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

// Fonction utilitaire pour normaliser une date à la fin du mois en UTC
const normalizeToEndOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  const lastDay = new Date(
    normalized.getUTCFullYear(),
    normalized.getUTCMonth() + 1,
    0
  ).getUTCDate();
  normalized.setUTCDate(lastDay);
  normalized.setUTCHours(23, 59, 59, 999);
  return normalized;
};

export function CategoryExpensesCard({
  categories: propCategories,
  currency = '€',
}: CategoryExpensesCardProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Record<string, Transaction[]>>(
    {}
  );
  const [loadingCategories, setLoadingCategories] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'chart'>('chart');

  // États pour la gestion des catégories
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

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

  // Filtrer les catégories en fonction de la recherche
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trier les catégories par montant (du plus élevé au plus bas)
  const sortedCategories = [...filteredCategories].sort((a, b) => b.amount - a.amount);

  // Fonction pour récupérer toutes les catégories
  const fetchAllCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const response = await fetch('/api/categories');

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setAllCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Impossible de récupérer les catégories');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Fonction pour ajouter une catégorie
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategory.name.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      const addedCategory = await response.json();
      setAllCategories([...allCategories, addedCategory]);
      setNewCategory({ name: '', color: '#6366f1' });
      toast.success('Catégorie ajoutée avec succès');
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error("Impossible d'ajouter la catégorie");
    }
  };

  // Fonction pour mettre à jour une catégorie
  const handleUpdateCategory = async (id: string, updatedData: Partial<Category>) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      const updatedCategory = await response.json();
      setAllCategories(
        allCategories.map(category => (category.id === id ? updatedCategory : category))
      );
      toast.success('Catégorie mise à jour avec succès');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Impossible de mettre à jour la catégorie');
    }
  };

  // Fonction pour supprimer une catégorie
  const handleDeleteCategory = async (id: string) => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir supprimer cette catégorie ? Les dépenses associées ne seront plus catégorisées.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      setAllCategories(allCategories.filter(category => category.id !== id));
      toast.success('Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Impossible de supprimer la catégorie');
    }
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
      // S'assurer que selectedMonth est un objet Date valide et normalisé
      const dateToUse = normalizeToStartOfMonth(
        selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth)
      );

      // Obtenir le début et la fin du mois sélectionné en UTC
      const start = normalizeToStartOfMonth(dateToUse).toISOString();
      const end = normalizeToEndOfMonth(dateToUse).toISOString();

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

  // Charger les catégories au montage du composant
  useEffect(() => {
    fetchAllCategories();
  }, []);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Dépenses par catégorie</CardTitle>
              <CardDescription>Répartition de vos dépenses pour {formattedMonth}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
              <Pencil1Icon className="h-4 w-4 mr-2" />
              Gérer les catégories
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-4">
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une catégorie..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>

            <Tabs
              defaultValue="chart"
              className="w-full sm:w-auto"
              onValueChange={value => setActiveView(value as 'list' | 'chart')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart">Graphique</TabsTrigger>
                <TabsTrigger value="list">Liste</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-muted-foreground text-center">
                <p>Aucune dépense catégorisée pour ce mois.</p>
                <p className="text-sm mt-1">
                  Ajoutez des transactions avec des catégories pour les voir apparaître ici.
                </p>
              </div>
            </div>
          ) : (
            <>
              {activeView === 'chart' ? (
                <div className="space-y-6">
                  {/* Graphique en barres horizontales */}
                  <div className="space-y-4">
                    {sortedCategories.map(category => {
                      const percentage = Math.round((category.amount / totalExpenses) * 100);
                      return (
                        <div key={category.id} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="font-medium text-sm">{category.name}</span>
                            </div>
                            <div className="text-sm font-medium">
                              <span>{formatAmount(category.amount)}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({percentage}%)
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-2"
                            style={
                              {
                                '--progress-indicator-color': category.color,
                              } as React.CSSProperties
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Résumé des dépenses */}
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total des dépenses catégorisées</span>
                      <span className="font-bold">{formatAmount(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {sortedCategories.map(category => (
                    <div key={category.id} className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer transition-colors ${selectedCategory === category.name ? 'bg-muted' : ''}`}
                        onClick={() => fetchCategoryTransactions(category.name)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            <span>{formatAmount(category.amount)}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({Math.round((category.amount / totalExpenses) * 100)}%)
                            </span>
                          </div>
                          {selectedCategory === category.name ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
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
                                    className="grid grid-cols-3 p-2 text-sm border-t hover:bg-muted/50 transition-colors"
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

                  {filteredCategories.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      Aucune catégorie ne correspond à votre recherche.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogue de gestion des catégories */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Gestion des catégories</DialogTitle>
            <DialogDescription>
              Ajoutez, modifiez ou supprimez des catégories pour vos dépenses
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 flex-1 overflow-hidden flex flex-col">
            <form onSubmit={handleAddCategory} className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="categoryName">Nouvelle catégorie</Label>
                <Input
                  id="categoryName"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Nom de la catégorie"
                />
              </div>
              <div className="space-y-2 w-24">
                <Label htmlFor="categoryColor">Couleur</Label>
                <Input
                  id="categoryColor"
                  type="color"
                  value={newCategory.color}
                  onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="h-10 p-1 cursor-pointer"
                />
              </div>
              <Button type="submit" size="icon" className="mb-0.5">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </form>

            <div className="border rounded-md flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-3 bg-muted p-4 font-medium">
                <div>Nom</div>
                <div>Couleur</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="overflow-y-auto flex-1">
                {isLoadingCategories ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : allCategories.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Aucune catégorie trouvée. Ajoutez des catégories pour commencer.
                  </div>
                ) : (
                  allCategories.map(category => (
                    <div key={category.id} className="grid grid-cols-3 p-4 border-t items-center">
                      <div>
                        <Input
                          value={category.name}
                          onChange={e =>
                            handleUpdateCategory(category.id, { name: e.target.value })
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={category.color}
                          onChange={e =>
                            handleUpdateCategory(category.id, { color: e.target.value })
                          }
                          className="w-12 h-8 p-1 cursor-pointer"
                        />
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 h-8 w-8"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
