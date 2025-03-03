'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { ExpenseListHeaderProps, SortField } from './types';

export function ExpenseListHeader({
  isSelectionMode,
  sortField,
  sortDirection,
  onSort,
  onSelectAll,
  selectedExpenses,
  filteredExpenses,
}: ExpenseListHeaderProps) {
  // Icône de tri
  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return null;
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="hidden sm:grid sm:grid-cols-12 bg-muted p-3 font-medium text-xs sm:text-sm">
      {isSelectionMode && (
        <div className="sm:col-span-1 flex items-center">
          <Checkbox
            checked={
              selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0
            }
            onCheckedChange={onSelectAll}
            id="select-all"
            aria-label="Sélectionner toutes les transactions"
          />
          <label htmlFor="select-all" className="ml-2 text-xs cursor-pointer">
            Tout
          </label>
        </div>
      )}
      <div
        className={`${isSelectionMode ? 'sm:col-span-2' : 'sm:col-span-3'} cursor-pointer hover:text-primary flex items-center`}
        onClick={() => onSort('name')}
      >
        Nom <SortIcon field="name" />
      </div>
      <div
        className="sm:col-span-2 cursor-pointer hover:text-primary flex items-center"
        onClick={() => onSort('category')}
      >
        Catégorie <SortIcon field="category" />
      </div>
      <div
        className="sm:col-span-2 cursor-pointer hover:text-primary flex items-center"
        onClick={() => onSort('date')}
      >
        Date <SortIcon field="date" />
      </div>
      <div
        className="sm:col-span-2 cursor-pointer hover:text-primary flex items-center justify-end"
        onClick={() => onSort('amount')}
      >
        Montant <SortIcon field="amount" />
      </div>
      <div className={`${isSelectionMode ? 'sm:col-span-3' : 'sm:col-span-3'} text-right`}>
        Actions
      </div>
    </div>
  );
}
