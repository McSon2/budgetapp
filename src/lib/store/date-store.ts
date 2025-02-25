import { startOfMonth } from 'date-fns';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DateState {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  nextMonth: () => void;
  previousMonth: () => void;
  resetToCurrentMonth: () => void;
}

export const useDateStore = create<DateState>()(
  persist(
    set => ({
      selectedMonth: startOfMonth(new Date()),

      setSelectedMonth: (date: Date) => set({ selectedMonth: startOfMonth(date) }),

      nextMonth: () =>
        set((state: DateState) => {
          const nextMonth = new Date(state.selectedMonth);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return { selectedMonth: startOfMonth(nextMonth) };
        }),

      previousMonth: () =>
        set((state: DateState) => {
          const prevMonth = new Date(state.selectedMonth);
          prevMonth.setMonth(prevMonth.getMonth() - 1);
          return { selectedMonth: startOfMonth(prevMonth) };
        }),

      resetToCurrentMonth: () => set({ selectedMonth: startOfMonth(new Date()) }),
    }),
    {
      name: 'date-storage',
      storage: createJSONStorage(() => localStorage),
      // Convertir les dates en objets Date lors de la désérialisation
      partialize: state => ({
        selectedMonth: state.selectedMonth.toISOString(),
      }),
      // Convertir les chaînes ISO en objets Date lors de la désérialisation
      onRehydrateStorage: () => state => {
        if (state) {
          state.selectedMonth = new Date(state.selectedMonth);
        }
      },
    }
  )
);
