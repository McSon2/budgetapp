import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DateState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  nextMonth: () => void;
  previousMonth: () => void;
  resetToCurrentMonth: () => void;
}

// Fonction utilitaire pour normaliser une date au début du mois
// Utiliser les méthodes locales au lieu des méthodes UTC pour éviter les problèmes de fuseau horaire
const normalizeToStartOfMonth = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setDate(1);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const useDateStore = create<DateState>()(
  persist(
    set => ({
      selectedMonth: normalizeToStartOfMonth(new Date()),

      setSelectedMonth: (date: Date) =>
        set({
          selectedMonth: normalizeToStartOfMonth(date),
        }),

      nextMonth: () =>
        set((state: DateState) => {
          const nextMonth = new Date(state.selectedMonth);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return { selectedMonth: normalizeToStartOfMonth(nextMonth) };
        }),

      previousMonth: () =>
        set((state: DateState) => {
          const prevMonth = new Date(state.selectedMonth);
          prevMonth.setMonth(prevMonth.getMonth() - 1);
          return { selectedMonth: normalizeToStartOfMonth(prevMonth) };
        }),

      resetToCurrentMonth: () =>
        set({
          selectedMonth: normalizeToStartOfMonth(new Date()),
        }),
    }),
    {
      name: 'date-storage',
      storage: createJSONStorage(() => localStorage),
      // Sérialiser la date en format ISO
      partialize: state => ({
        selectedMonth: state.selectedMonth.toISOString(),
      }),
      // Désérialiser la chaîne ISO en objet Date et normaliser
      onRehydrateStorage: () => state => {
        if (state && state.selectedMonth) {
          state.selectedMonth = normalizeToStartOfMonth(new Date(state.selectedMonth));
        }
      },
    }
  )
);
