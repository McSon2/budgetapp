'use client';

import { DashboardData } from '@/lib/services/dashboard-service';
import { useDateStore } from '@/lib/store/date-store';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// Étendre l'interface DashboardData pour inclure la fonction de rafraîchissement
interface DashboardContextData extends DashboardData {
  refreshData: () => Promise<void>;
}

// Créer un contexte pour les données du dashboard
const DashboardContext = createContext<DashboardContextData | null>(null);

// Hook personnalisé pour utiliser le contexte
export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a MonthProvider');
  }
  return context;
}

interface MonthProviderProps {
  children: React.ReactNode;
  initialData: DashboardData;
}

// Fonction utilitaire pour normaliser une date au début du mois en UTC
const normalizeToStartOfMonth = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const normalized = new Date(dateObj);
  normalized.setUTCDate(1);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

export function MonthProvider({ children, initialData }: MonthProviderProps) {
  const { selectedMonth } = useDateStore();
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);

  // Fonction pour récupérer les données du dashboard
  const fetchData = useCallback(async () => {
    try {
      // S'assurer que selectedMonth est un objet Date valide et normalisé
      const dateToUse = normalizeToStartOfMonth(
        selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth)
      );

      // Utiliser une méthode sécurisée pour obtenir la chaîne ISO
      const dateParam = dateToUse.toISOString();

      const response = await fetch(`/api/dashboard?date=${dateParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [selectedMonth]);

  // Fonction pour rafraîchir les données du dashboard
  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, fetchData]);

  // Créer un contexte pour les données du dashboard avec la fonction de rafraîchissement
  const contextValue: DashboardContextData = {
    ...dashboardData,
    refreshData,
  };

  return <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>;
}
