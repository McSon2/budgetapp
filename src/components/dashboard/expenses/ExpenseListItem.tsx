'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckIcon, ResetIcon } from '@radix-ui/react-icons';
import { ExpenseItemProps } from './types';

export function ExpenseListItem({
  expense,
  isSelected,
  isSelectionMode,
  onSelect,
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  return (
    <div
      className={`border-t hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
    >
      {/* Version mobile */}
      <div className="sm:hidden p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div className="font-medium flex items-center gap-1">
            {isSelectionMode && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(expense.id)}
                className="mr-2"
                aria-label={`Sélectionner ${expense.name}`}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">{expense.name}</span>
              {(expense.isRecurring || expense.isGenerated) && (
                <span className="inline-flex ml-1">
                  <ResetIcon className="h-3 w-3 text-muted-foreground" />
                </span>
              )}
            </div>
          </div>
          <div className={`font-medium ${expense.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {expense.amount.toFixed(2)} €
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {new Date(expense.date).toLocaleDateString()}
          </div>
          {expense.category ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {expense.category}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Non catégorisé</span>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {!isSelectionMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(expense)}
                className="h-8 px-2 text-xs"
              >
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={() => onDelete(expense.id)}
              >
                Supprimer
              </Button>
            </>
          ) : (
            <Button
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onSelect(expense.id)}
            >
              {isSelected ? (
                <>
                  <CheckIcon className="mr-1 h-4 w-4" /> Sélectionné
                </>
              ) : (
                'Sélectionner'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Version desktop */}
      <div className="hidden sm:grid sm:grid-cols-12 p-3 items-center">
        {isSelectionMode && (
          <div className="sm:col-span-1 flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(expense.id)}
              aria-label={`Sélectionner ${expense.name}`}
            />
          </div>
        )}
        <div
          className={`${isSelectionMode ? 'sm:col-span-2' : 'sm:col-span-3'} truncate flex items-center`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{expense.name}</span>
            {(expense.isRecurring || expense.isGenerated) && (
              <span className="inline-flex ml-1">
                <ResetIcon className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          {expense.category ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {expense.category}
            </span>
          ) : (
            <span className="text-muted-foreground">Non catégorisé</span>
          )}
        </div>
        <div className="sm:col-span-2">{new Date(expense.date).toLocaleDateString()}</div>
        <div
          className={`sm:col-span-2 text-right font-medium ${expense.amount < 0 ? 'text-red-500' : 'text-green-500'}`}
        >
          {expense.amount.toFixed(2)} €
        </div>
        <div
          className={`${isSelectionMode ? 'sm:col-span-3' : 'sm:col-span-3'} flex justify-end gap-2`}
        >
          {!isSelectionMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}>
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                onClick={() => onDelete(expense.id)}
              >
                Supprimer
              </Button>
            </>
          ) : (
            <Button
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(expense.id)}
            >
              {isSelected ? (
                <>
                  <CheckIcon className="mr-1 h-4 w-4" /> Sélectionné
                </>
              ) : (
                'Sélectionner'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
