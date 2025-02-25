'use client';

import { DashboardData } from '@/lib/services/dashboard-service';
import { useDateStore } from '@/lib/store/date-store';
import { useEffect, useState } from 'react';

interface MonthProviderProps {
  children: React.ReactNode;
  initialData: DashboardData;
}

export function MonthProvider({ children, initialData }: MonthProviderProps) {
  const { selectedMonth } = useDateStore();
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);

  useEffect(() => {
    async function fetchData() {
      try {
        // S'assurer que selectedMonth est un objet Date valide
        const dateToUse = selectedMonth instanceof Date ? selectedMonth : new Date(selectedMonth);

        // Utiliser une méthode sécurisée pour obtenir la chaîne ISO
        const dateParam = dateToUse.toISOString
          ? dateToUse.toISOString()
          : new Date().toISOString();

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

// Créer un contexte pour les données du dashboard
import { createContext, useContext } from 'react';

const DashboardContext = createContext<DashboardData | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a MonthProvider');
  }
  return context;
}
