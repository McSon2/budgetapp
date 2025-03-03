import { Prisma } from '@prisma/client';

// Type pour les dépenses retournées au frontend
export interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  isRecurring?: boolean;
  recurrenceFrequency?: string;
  recurrenceEndDate?: string;
  isGenerated?: boolean;
}

// Type pour les dépenses générées à partir des récurrences
export interface GeneratedExpense extends Expense {
  isGenerated: true;
}

// Type pour les dépenses avec récurrence
export interface ExpenseWithRecurrence extends Omit<Expense, 'id'> {
  isRecurring: boolean;
  recurrence?: {
    frequency: string;
    startDate: string;
    endDate?: string;
  };
}

// Type pour les dépenses récurrentes
export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  nextDate: string;
}

// Type pour les filtres de dépenses
export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  categories?: string[];
  search?: string;
}

// Type pour les options de pagination
export interface PaginationOptions {
  skip?: number;
  take?: number;
}

// Type pour les résultats de recherche de dépenses
export interface ExpenseSearchResult {
  expenses: Expense[];
  total: number;
  hasMore: boolean;
}

// Type pour les dépenses avec leurs relations depuis Prisma
export type DbExpenseWithRelations = Prisma.ExpenseGetPayload<{
  include: {
    category: true;
    recurrence: true;
  };
}>;
