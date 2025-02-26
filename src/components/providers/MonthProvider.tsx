'use client';

import { DashboardData } from '@/lib/services/dashboard-service';
import { useDateStore } from '@/lib/store/date-store';
import { createContext, useContext, useEffect, useState } from 'react';

// Créer un contexte pour les données du dashboard
const DashboardContext = createContext<DashboardData | null>(null);

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

  useEffect(() => {
    async function fetchData() {
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
    }

    fetchData();
  }, [selectedMonth]);

  // Créer un contexte pour les données du dashboard
  return <DashboardContext.Provider value={dashboardData}>{children}</DashboardContext.Provider>;
}
