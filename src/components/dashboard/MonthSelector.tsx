'use client';

import { Button } from '@/components/ui/button';
import { useDateStore } from '@/lib/store/date-store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export function MonthSelector() {
  const { selectedMonth, nextMonth, previousMonth, resetToCurrentMonth } = useDateStore();

  // S'assurer que selectedMonth est un objet Date valide
  const dateToUse =
    selectedMonth instanceof Date
      ? selectedMonth
      : typeof selectedMonth === 'string'
        ? new Date(selectedMonth)
        : new Date();

  // Formater le mois et l'année (ex: "Juin 2023")
  const formattedMonth = format(dateToUse, 'MMMM yyyy', { locale: fr });

  // Vérifier si le mois sélectionné est le mois actuel
  const isCurrentMonth = format(dateToUse, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={previousMonth} aria-label="Mois précédent">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="min-w-32 text-center font-medium">{formattedMonth}</div>

      <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Mois suivant">
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="icon"
          onClick={resetToCurrentMonth}
          aria-label="Revenir au mois actuel"
          title="Revenir au mois actuel"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
