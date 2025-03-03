'use client';

import { Button } from '@/components/ui/button';
import { ExpenseListActionsProps } from './types';

export function ExpenseListActions({
  isSelectionMode,
  setIsSelectionMode,
  selectedExpenses,
  onCancelSelection,
  onDeleteSelected,
}: ExpenseListActionsProps) {
  return (
    <>
      {!isSelectionMode ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsSelectionMode(true)}
          className="hidden sm:flex"
        >
          Sélection multiple
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancelSelection}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            disabled={selectedExpenses.length === 0}
          >
            Supprimer ({selectedExpenses.length})
          </Button>
        </div>
      )}
    </>
  );
}
