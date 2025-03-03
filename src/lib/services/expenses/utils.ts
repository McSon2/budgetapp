import { startOfDay } from 'date-fns';
import { DbExpenseWithRelations, Expense } from './types';

/**
 * Normalise une date en la convertissant au début du jour en UTC
 * @param dateString - La date à normaliser au format ISO string
 * @returns La date normalisée
 */
export function normalizeDate(dateString: string): Date {
  const date = new Date(dateString);
  return startOfDay(date);
}

/**
 * Convertit une dépense de la base de données au format attendu par le frontend
 * @param dbExpense - La dépense récupérée de la base de données
 * @returns La dépense au format frontend
 */
export function mapDbExpenseToExpense(dbExpense: DbExpenseWithRelations): Expense {
  return {
    id: dbExpense.id,
    name: dbExpense.description,
    amount: dbExpense.amount,
    date: dbExpense.date.toISOString(),
    category: dbExpense.category?.name || 'Non catégorisé',
    isRecurring: dbExpense.isRecurring,
    recurrenceFrequency: dbExpense.recurrence?.frequency,
    recurrenceEndDate: dbExpense.recurrence?.endDate?.toISOString(),
  };
}

/**
 * Vérifie si une dépense correspond aux filtres spécifiés
 * @param expense - La dépense à vérifier
 * @param search - Le terme de recherche
 * @param categories - Les catégories à filtrer
 * @returns true si la dépense correspond aux filtres, false sinon
 */
export function matchesFilters(expense: Expense, search?: string, categories?: string[]): boolean {
  // Vérifier si la dépense correspond au terme de recherche
  if (search && search.trim() !== '') {
    const searchLower = search.toLowerCase();
    const nameMatches = expense.name.toLowerCase().includes(searchLower);
    const categoryMatches = expense.category.toLowerCase().includes(searchLower);

    if (!nameMatches && !categoryMatches) {
      return false;
    }
  }

  // Vérifier si la dépense correspond aux catégories sélectionnées
  if (categories && categories.length > 0) {
    if (!categories.includes(expense.category)) {
      return false;
    }
  }

  return true;
}

/**
 * Génère un ID unique pour une occurrence de dépense récurrente
 * @param baseId - L'ID de base de la dépense récurrente
 * @param date - La date de l'occurrence
 * @returns Un ID unique pour l'occurrence
 */
export function generateRecurrenceId(baseId: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Les mois commencent à 0
  const day = date.getDate();
  return `${baseId}-${year}-${month}-${day}`;
}

/**
 * Crée une clé unique pour une date d'occurrence de dépense récurrente
 * @param id - L'ID de la dépense récurrente
 * @param date - La date de l'occurrence
 * @returns Une clé unique pour la date
 */
export function createDateKey(id: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Les mois commencent à 0
  const day = date.getDate();
  return `${id}-${year}-${month}-${day}`;
}
