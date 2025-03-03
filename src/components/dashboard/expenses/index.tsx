'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDateStore } from '@/lib/store/date-store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EditExpenseDialog } from './EditExpenseDialog';
import { ExpenseFilters } from './ExpenseFilters';
import { ExpenseListActions } from './ExpenseListActions';
import { ExpenseListHeader } from './ExpenseListHeader';
import { ExpenseListItem } from './ExpenseListItem';
import { RecurringExpenseModifierDialog } from './RecurringExpenseModifierDialog';
import { useExpenses } from './useExpenses';

export function ExpensesList() {
  const {
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
    displayedExpenses,
    filteredAndSortedExpenses,
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
  } = useExpenses();

  // Récupérer le mois sélectionné depuis le store
  const { selectedMonth } = useDateStore();

  // Formater le mois pour l'affichage
  const formattedMonth = format(
    selectedMonth, // Utiliser le mois sélectionné depuis le store
    'MMMM yyyy',
    { locale: fr }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg sm:text-xl">Vos Transactions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Consultez et gérez vos transactions pour {formattedMonth}
            </CardDescription>
          </div>
          <ExpenseListActions
            isSelectionMode={isSelectionMode}
            setIsSelectionMode={setIsSelectionMode}
            selectedExpenses={selectedExpenses}
            onCancelSelection={handleCancelSelection}
            onDeleteSelected={handleDeleteSelected}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres et recherche */}
        <ExpenseFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          categories={categories}
        />

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              {/* En-tête du tableau - visible uniquement sur tablette/desktop */}
              <ExpenseListHeader
                isSelectionMode={isSelectionMode}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onSelectAll={handleSelectAll}
                selectedExpenses={selectedExpenses}
                filteredExpenses={filteredAndSortedExpenses}
              />

              {displayedExpenses.length > 0 ? (
                <>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {displayedExpenses.map(expense => (
                      <ExpenseListItem
                        key={expense.id}
                        expense={expense}
                        isSelected={selectedExpenses.includes(expense.id)}
                        isSelectionMode={isSelectionMode}
                        onSelect={handleSelectExpense}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}

                    {/* Élément observé pour le scroll infini */}
                    {hasMore && (
                      <div ref={observerTarget} className="p-4 flex justify-center items-center">
                        {isLoadingMore ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Faites défiler pour voir plus
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  {filteredAndSortedExpenses.length === 0 ? (
                    <>
                      Aucune transaction trouvée pour {formattedMonth}.
                      <br />
                      <span className="text-sm">Ajoutez des transactions pour commencer.</span>
                    </>
                  ) : (
                    <>
                      Aucune transaction ne correspond à vos critères de recherche.
                      <br />
                      <span className="text-sm">Essayez de modifier vos filtres.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Compteur de résultats et bouton de sélection multiple pour mobile */}
            <div className="flex justify-between items-center">
              {filteredAndSortedExpenses.length > 0 && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Affichage de{' '}
                  {Math.min(displayedExpenses.length, filteredAndSortedExpenses.length)} sur{' '}
                  {filteredAndSortedExpenses.length} transactions
                </div>
              )}

              {!isSelectionMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="sm:hidden"
                >
                  Sélection multiple
                </Button>
              ) : (
                <div className="sm:hidden flex items-center gap-2">
                  {selectedExpenses.length > 0 && (
                    <span className="text-xs">{selectedExpenses.length} sélectionné(s)</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-xs px-2 h-8"
                  >
                    {selectedExpenses.length === filteredAndSortedExpenses.length &&
                    filteredAndSortedExpenses.length > 0
                      ? 'Désélectionner tout'
                      : 'Tout sélectionner'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Dialogue d'édition */}
      {editingExpense &&
        (editingExpense.isRecurring ? (
          <RecurringExpenseModifierDialog
            expense={editingExpense}
            categories={categories}
            onClose={handleCancelEdit}
            onModified={() => {
              handleCancelEdit();
              // Rafraîchir les données
              window.location.reload();
            }}
          />
        ) : (
          <EditExpenseDialog
            expense={editingExpense}
            categories={categories}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        ))}
    </Card>
  );
}
