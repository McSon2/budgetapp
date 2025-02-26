'use client';

import { Button } from '@/components/ui/button';
import { useDateStore } from '@/lib/store/date-store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

// Fonction utilitaire pour normaliser une date au début du mois en UTC
const normalizeToStartOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  normalized.setUTCDate(1);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

export function MonthSelector() {
  const { selectedMonth, nextMonth, previousMonth, resetToCurrentMonth } = useDateStore();

  // S'assurer que selectedMonth est un objet Date valide et normalisé
  const dateToUse = normalizeToStartOfMonth(
    selectedMonth instanceof Date
      ? selectedMonth
      : typeof selectedMonth === 'string'
        ? new Date(selectedMonth)
        : new Date()
  );

  // Formater le mois et l'année (ex: "Juin 2023")
  const formattedMonth = format(dateToUse, 'MMMM yyyy', { locale: fr });

  // Vérifier si le mois sélectionné est le mois actuel
  const currentDate = new Date();
  const isCurrentMonth =
    dateToUse.getUTCFullYear() === currentDate.getUTCFullYear() &&
    dateToUse.getUTCMonth() === currentDate.getUTCMonth();

  return (
    <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto bg-muted/50 rounded-lg p-1 sm:p-1.5">
      <Button
        variant="ghost"
        size="icon"
        onClick={previousMonth}
        aria-label="Mois précédent"
        className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-background"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex-1 text-center font-medium text-sm sm:text-base px-2 py-1">
        {formattedMonth}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={nextMonth}
        aria-label="Mois suivant"
        className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-background"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="icon"
          onClick={resetToCurrentMonth}
          aria-label="Revenir au mois actuel"
          title="Revenir au mois actuel"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-background ml-1"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
