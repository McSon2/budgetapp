'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryExpense {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface CategoryExpensesCardProps {
  categories: CategoryExpense[];
  currency?: string;
}

interface PieLabel {
  name: string;
  percent: number;
}

// Type pour les données du graphique
interface ChartData {
  name: string;
  value: number;
  color: string;
}

// Chargement dynamique du graphique côté client uniquement
const DynamicPieChart = dynamic(
  () =>
    Promise.resolve(
      ({ data, formatAmount }: { data: ChartData[]; formatAmount: (amount: number) => string }) => (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }: PieLabel) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatAmount(value)}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center">Chargement du graphique...</div>
    ),
  }
);

export function CategoryExpensesCard({ categories, currency = '€' }: CategoryExpensesCardProps) {
  const [error] = useState<string | null>(null);

  // Calculer le total des dépenses
  const totalExpenses = categories.reduce((sum, category) => sum + category.amount, 0);

  // Préparer les données pour le graphique
  const chartData = categories.map(category => ({
    name: category.name,
    value: category.amount,
    color: category.color,
  }));

  // Formater le montant pour l'affichage
  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dépenses par catégorie</CardTitle>
        <CardDescription>Répartition de vos dépenses par catégorie</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense catégorisée.</p>
        ) : (
          <div className="space-y-4">
            <div className="h-[200px]">
              {error ? (
                <div className="h-full flex items-center justify-center text-red-500">
                  Erreur de chargement du graphique: {error}
                </div>
              ) : (
                <DynamicPieChart data={chartData} formatAmount={formatAmount} />
              )}
            </div>

            <div className="space-y-2">
              {categories.map(category => (
                <div key={category.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="text-sm font-medium">
                    <span>{formatAmount(category.amount)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({Math.round((category.amount / totalExpenses) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
