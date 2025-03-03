import { Category } from '@/lib/services/categories-service';
import { Expense } from '@/lib/services/expenses-service';
import { z } from 'zod';

// Type pour les données mises à jour d'une dépense
export interface UpdatedExpense {
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
export const editFormSchema = z.object({
  name: z.string().min(1, 'La description est requise'),
  amount: z.coerce.number().min(0.01, 'Le montant doit être supérieur à 0'),
  type: z.enum(['expense', 'income']),
  date: z.date(),
  category: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.string().optional(),
  recurrenceEndDate: z.date().optional(),
});

export type EditFormValues = z.infer<typeof editFormSchema>;

// Types pour le tri
export type SortField = 'name' | 'category' | 'date' | 'amount';
export type SortDirection = 'asc' | 'desc';

// Type pour les filtres
export type ExpenseTypeFilter = 'all' | 'expense' | 'income';

// Props partagées entre composants
export interface ExpenseItemProps {
  expense: Expense;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export interface ExpenseFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  typeFilter: ExpenseTypeFilter;
  setTypeFilter: (type: ExpenseTypeFilter) => void;
  categories: Category[];
}

export interface ExpenseListHeaderProps {
  isSelectionMode: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSelectAll: () => void;
  selectedExpenses: string[];
  filteredExpenses: Expense[];
}

export interface ExpenseListActionsProps {
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  selectedExpenses: string[];
  onCancelSelection: () => void;
  onDeleteSelected: () => void;
}
