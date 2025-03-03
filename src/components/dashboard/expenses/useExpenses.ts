'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Category } from '@/lib/services/categories-service';
import { Expense } from '@/lib/services/expenses-service';
import { useDateStore } from '@/lib/store/date-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExpenseTypeFilter, SortDirection, SortField, UpdatedExpense } from './types';

export function useExpenses() {
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
  const [typeFilter, setTypeFilter] = useState<ExpenseTypeFilter>('all');

  // États pour le tri
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Scroll infini au lieu de pagination
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Récupérer le mois sélectionné depuis le store
  const { selectedMonth } = useDateStore();

  // Récupérer le contexte du dashboard pour pouvoir le rafraîchir
  const dashboardData = useDashboard();
  const refreshDashboard = dashboardData.refreshData;

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
    // Pour les transactions prévisionnelles générées
    if (expense.isGenerated) {
      // Trouver la transaction récurrente originale
      // Le format est généralement originalId-YYYY-MM-DD
      const idParts = expense.id.split('-');
      const originalId = idParts[0]; // Prendre la première partie comme ID original

      // Deux possibilités : soit trouver la transaction avec l'ID exact (originale),
      // soit trouver une autre transaction générée du même parent et extraire son ID
      const originalExpense = expenses.find(e => e.id === originalId);

      // Si on ne trouve pas la transaction originale directement, cherchons parmi les autres transactions générées
      if (!originalExpense) {
        // Il est possible que la transaction originale ne soit pas dans le mois actuel
        // Cherchons alors parmi les autres transactions générées qui partagent le même ID de base

        // Chercher si cette transaction elle-même pourrait être utilisée (cas le plus simple)
        if (expense.isRecurring) {
          setEditingExpense(expense);
          return;
        }

        // Tentative de récupération depuis l'API
        toast.promise(
          fetch(`/api/expenses/recurring-parent/${originalId}`)
            .then(response => {
              if (!response.ok) {
                throw new Error("Impossible de trouver la transaction récurrente d'origine");
              }
              return response.json();
            })
            .then(parentExpense => {
              setEditingExpense(parentExpense);
            }),
          {
            loading: "Recherche de la transaction récurrente d'origine...",
            success: 'Transaction récurrente trouvée',
            error:
              "Cette transaction fait partie d'une série récurrente. Veuillez modifier la transaction d'origine depuis le mois où elle a été créée.",
          }
        );
        return;
      }
      // Si nous avons trouvé la transaction d'origine, nous la passons pour modification
      setEditingExpense(originalExpense);
      return;
    }

    // Si c'est une transaction récurrente (mais pas générée), définir directement pour l'édition
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
  const handleSort = (field: SortField) => {
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
    const filteredExpenses = getFilteredAndSortedExpenses();
    if (selectedExpenses.length === filteredExpenses.length) {
      // Si toutes sont sélectionnées, on désélectionne tout
      setSelectedExpenses([]);
    } else {
      // Sinon, on sélectionne toutes les transactions filtrées
      setSelectedExpenses(filteredExpenses.map(expense => expense.id));
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

  return {
    expenses,
    categories,
    isLoading,
    editingExpense,
    selectedExpenses,
    isSelectionMode,
    searchTerm,
    categoryFilter,
    typeFilter,
    sortField,
    sortDirection,
    hasMore,
    isLoadingMore,
    observerTarget,
    displayLimit,
    filteredAndSortedExpenses,
    displayedExpenses,
    setSearchTerm,
    setCategoryFilter,
    setTypeFilter,
    setIsSelectionMode,
    handleDelete,
    handleEdit,
    handleSaveEdit,
    handleCancelEdit,
    handleSort,
    handleSelectExpense,
    handleSelectAll,
    handleDeleteSelected,
    handleCancelSelection,
  };
}
