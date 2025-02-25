'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ListBulletIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { AddExpensePopover } from './AddExpensePopover';
import { CategoriesManager } from './CategoriesManager';
import { ExpensesList } from './ExpensesList';

// Créer une icône de tag personnalisée si TagIcon n'est pas disponible dans radix-ui
function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.95 7.5L8.45 13.05C8.35 13.15 8.25 13.2 8.1 13.25C7.95 13.3 7.8 13.3 7.65 13.25C7.5 13.2 7.35 13.15 7.25 13.05L1.05 6.85C0.95 6.75 0.9 6.65 0.85 6.5C0.8 6.35 0.8 6.2 0.85 6.05L1.85 1.85C1.9 1.65 2 1.5 2.15 1.35C2.3 1.2 2.45 1.1 2.65 1.05L6.85 0.05C7 0 7.15 0 7.3 0.05C7.45 0.1 7.55 0.15 7.65 0.25L13.95 6.55C14.05 6.65 14.1 6.75 14.15 6.9C14.2 7.05 14.2 7.2 14.15 7.35C14.1 7.5 14.05 7.6 13.95 7.5ZM4.5 5C4.8 5 5.05 4.9 5.25 4.7C5.45 4.5 5.55 4.25 5.55 3.95C5.55 3.65 5.45 3.4 5.25 3.2C5.05 3 4.8 2.9 4.5 2.9C4.2 2.9 3.95 3 3.75 3.2C3.55 3.4 3.45 3.65 3.45 3.95C3.45 4.25 3.55 4.5 3.75 4.7C3.95 4.9 4.2 5 4.5 5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ActionButtons() {
  const [showExpensesList, setShowExpensesList] = useState(false);
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);

  const handleToggleExpensesList = () => {
    setShowExpensesList(!showExpensesList);
    if (showCategoriesManager) setShowCategoriesManager(false);
  };

  const handleToggleCategoriesManager = () => {
    setShowCategoriesManager(!showCategoriesManager);
    if (showExpensesList) setShowExpensesList(false);
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <AddExpensePopover />
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleToggleExpensesList}
              >
                <ListBulletIcon className="h-4 w-4 mr-2" />
                Liste des dépenses
              </Button>
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleToggleCategoriesManager}
              >
                <TagIcon />
                <span className="ml-2">Gérer les catégories</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showExpensesList && (
        <div className="mt-6">
          <ExpensesList />
        </div>
      )}

      {showCategoriesManager && (
        <div className="mt-6">
          <CategoriesManager />
        </div>
      )}
    </>
  );
}
