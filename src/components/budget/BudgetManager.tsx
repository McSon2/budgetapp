'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip as UITooltip,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  CheckIcon,
  Cross2Icon,
  InfoCircledIcon,
  LockClosedIcon,
  LockOpen1Icon,
  MixerHorizontalIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// Types pour les catégories de budget
interface BudgetCategory {
  id: string;
  name: string;
  percentage: number;
  color: string;
  amount: number;
}

// Type pour le matelas de sécurité
interface SafetyCushion {
  amount: number;
  enabled: boolean;
}

export function BudgetManager() {
  const dashboardData = useDashboard();
  const endOfMonthBalance = dashboardData.endOfMonthBalance;

  // État pour les catégories de budget (règle 50/30/10/10 par défaut)
  const [categories, setCategories] = useState<BudgetCategory[]>([
    { id: '1', name: 'Courses', percentage: 50, color: '#FF6384', amount: 0 },
    { id: '2', name: 'Transport', percentage: 30, color: '#36A2EB', amount: 0 },
    { id: '3', name: 'Plaisir', percentage: 10, color: '#FFCE56', amount: 0 },
    { id: '4', name: 'Épargne', percentage: 10, color: '#4BC0C0', amount: 0 },
  ]);

  // État pour le matelas de sécurité
  const [safetyCushion, setSafetyCushion] = useState<SafetyCushion>({
    amount: 200,
    enabled: true,
  });

  // État pour le mode d'édition
  const [editMode, setEditMode] = useState(false);

  // État pour le solde disponible après matelas
  const [availableBalance, setAvailableBalance] = useState(0);

  // État pour l'animation de la vue
  const [activeView, setActiveView] = useState<'pie' | 'flow' | 'distribution'>('pie');

  // État pour suivre si les pourcentages sont verrouillés
  const [percentagesLocked, setPercentagesLocked] = useState(true);

  // Référence pour le conteneur de graphique
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Calculer les montants en fonction des pourcentages et du solde disponible
  useEffect(() => {
    // Calculer le solde disponible après déduction du matelas si activé
    const balanceAfterCushion = safetyCushion.enabled
      ? Math.max(0, endOfMonthBalance - safetyCushion.amount)
      : endOfMonthBalance;

    setAvailableBalance(balanceAfterCushion);

    // Mettre à jour les montants des catégories
    setCategories(prevCategories =>
      prevCategories.map(category => ({
        ...category,
        amount: (category.percentage / 100) * balanceAfterCushion,
      }))
    );
  }, [endOfMonthBalance, safetyCushion, categories.map(c => c.percentage).join(',')]);

  // Fonction pour mettre à jour le pourcentage d'une catégorie
  const updateCategoryPercentage = (id: string, newPercentage: number) => {
    if (percentagesLocked) return;

    setCategories(prevCategories => {
      // Trouver la catégorie à mettre à jour
      const categoryToUpdate = prevCategories.find(c => c.id === id);
      if (!categoryToUpdate) return prevCategories;

      // Calculer la différence de pourcentage
      const percentageDiff = newPercentage - categoryToUpdate.percentage;

      // Si la différence est nulle, ne rien faire
      if (percentageDiff === 0) return prevCategories;

      // Calculer le total des autres pourcentages
      const otherCategories = prevCategories.filter(c => c.id !== id);
      const otherPercentageTotal = otherCategories.reduce((sum, c) => sum + c.percentage, 0);

      // Ajuster les autres catégories proportionnellement
      const updatedCategories = otherCategories.map(category => {
        const adjustmentFactor = category.percentage / otherPercentageTotal;
        const adjustedPercentage = Math.max(
          1,
          category.percentage - percentageDiff * adjustmentFactor
        );

        return {
          ...category,
          percentage: adjustedPercentage,
        };
      });

      // Ajouter la catégorie mise à jour
      updatedCategories.push({
        ...categoryToUpdate,
        percentage: newPercentage,
      });

      // Trier les catégories par ID pour maintenir l'ordre
      return updatedCategories.sort((a, b) => a.id.localeCompare(b.id));
    });
  };

  // Fonction pour normaliser les pourcentages à 100%
  const normalizePercentages = () => {
    setCategories(prevCategories => {
      const total = prevCategories.reduce((sum, category) => sum + category.percentage, 0);

      if (Math.abs(total - 100) < 0.1) return prevCategories; // Déjà proche de 100%

      return prevCategories.map(category => ({
        ...category,
        percentage: (category.percentage / total) * 100,
      }));
    });
  };

  // Données pour le graphique en camembert
  const pieChartData = categories.map(category => ({
    name: category.name,
    value: category.percentage,
    color: category.color,
    amount: category.amount,
  }));

  // Données pour le graphique de flux
  const flowChartData = [
    { name: 'Solde', value: endOfMonthBalance },
    { name: 'Matelas', value: safetyCushion.enabled ? safetyCushion.amount : 0 },
    { name: 'Disponible', value: availableBalance },
    ...categories.map(category => ({
      name: category.name,
      value: category.amount,
    })),
  ];

  // Données pour le graphique de distribution
  const distributionData = categories.map(category => ({
    name: category.name,
    value: category.amount,
    color: category.color,
  }));

  // Fonction pour formater les montants en euros
  const formatEuro = (value: number) => {
    return `${value.toLocaleString('fr-FR')} €`;
  };

  // Fonction pour réinitialiser aux valeurs par défaut (50/30/10/10)
  const resetToDefault = () => {
    setCategories([
      { id: '1', name: 'Courses', percentage: 50, color: '#FF6384', amount: 0 },
      { id: '2', name: 'Transport', percentage: 30, color: '#36A2EB', amount: 0 },
      { id: '3', name: 'Plaisir', percentage: 10, color: '#FFCE56', amount: 0 },
      { id: '4', name: 'Épargne', percentage: 10, color: '#4BC0C0', amount: 0 },
    ]);
  };

  // Effet pour normaliser les pourcentages lorsqu'on quitte le mode édition
  useEffect(() => {
    if (!editMode) {
      normalizePercentages();
    }
  }, [editMode]);

  return (
    <div className="space-y-6">
      {/* Carte principale avec animation */}
      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="relative">
            {/* En-tête avec informations de solde */}
            <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Budget Prévisionnel</h2>
                  <p className="text-muted-foreground">
                    Basé sur un solde de fin de mois de{' '}
                    <span className="font-semibold text-primary">
                      {formatEuro(endOfMonthBalance)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Boutons de vue */}
                  <div className="flex bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                    <Button
                      variant={activeView === 'pie' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('pie')}
                      className="rounded-md"
                    >
                      Camembert
                    </Button>
                    <Button
                      variant={activeView === 'flow' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('flow')}
                      className="rounded-md"
                    >
                      Flux
                    </Button>
                    <Button
                      variant={activeView === 'distribution' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setActiveView('distribution')}
                      className="rounded-md"
                    >
                      Distribution
                    </Button>
                  </div>

                  {/* Bouton d'édition */}
                  <Button
                    variant={editMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                    className={cn(
                      'rounded-full w-10 h-10 p-0',
                      editMode && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <MixerHorizontalIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Visualisation du budget */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Graphique */}
                <div
                  ref={chartContainerRef}
                  className={cn(
                    'lg:col-span-2 h-[400px] rounded-xl overflow-hidden bg-background/50 backdrop-blur-sm p-4 shadow-sm',
                    editMode && 'opacity-50 pointer-events-none'
                  )}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeView}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full"
                    >
                      {activeView === 'pie' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={140}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, percent }) =>
                                `${name} ${(percent * 100).toFixed(0)}%`
                              }
                              labelLine={false}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name, props) => [
                                `${formatEuro(props.payload.amount)} (${value}%)`,
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}

                      {activeView === 'flow' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={flowChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={value => [formatEuro(value as number), '']} />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#8884d8"
                              fill="url(#colorGradient)"
                              strokeWidth={2}
                            />
                            <defs>
                              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
                              </linearGradient>
                            </defs>
                          </AreaChart>
                        </ResponsiveContainer>
                      )}

                      {activeView === 'distribution' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={distributionData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            stackOffset="expand"
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={value => `${(value * 100).toFixed(0)}%`} />
                            <Tooltip formatter={value => [formatEuro(value as number), '']} />
                            {distributionData.map((entry, index) => (
                              <Area
                                key={`area-${index}`}
                                type="monotone"
                                dataKey="value"
                                stackId="1"
                                stroke={entry.color}
                                fill={entry.color}
                                name={entry.name}
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Panneau latéral */}
                <div className="space-y-4">
                  {/* Matelas de sécurité */}
                  <Card className="bg-background/50 backdrop-blur-sm shadow-sm border-muted/60">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-sm">Matelas de sécurité</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSafetyCushion(prev => ({ ...prev, enabled: !prev.enabled }))
                          }
                          className="h-8 w-8 p-0"
                        >
                          {safetyCushion.enabled ? (
                            <LockClosedIcon className="h-4 w-4" />
                          ) : (
                            <LockOpen1Icon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={safetyCushion.amount}
                          onChange={e =>
                            setSafetyCushion(prev => ({
                              ...prev,
                              amount: Math.max(0, parseFloat(e.target.value) || 0),
                            }))
                          }
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">€</span>

                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <InfoCircledIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-xs">
                                Le matelas de sécurité est une somme que vous souhaitez conserver et
                                ne pas inclure dans votre budget mensuel.
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      </div>

                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Solde disponible:</span>
                          <span className="font-medium">{formatEuro(availableBalance)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Répartition du budget */}
                  <Card
                    className={cn(
                      'bg-background/50 backdrop-blur-sm shadow-sm border-muted/60',
                      editMode && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                  >
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-sm">Répartition du budget</h3>

                        <div className="flex items-center gap-1">
                          {editMode && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPercentagesLocked(!percentagesLocked)}
                                className="h-8 w-8 p-0"
                              >
                                {percentagesLocked ? (
                                  <LockClosedIcon className="h-4 w-4" />
                                ) : (
                                  <LockOpen1Icon className="h-4 w-4" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={resetToDefault}
                                className="h-8 w-8 p-0"
                              >
                                <ReloadIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <AnimatePresence>
                          {categories.map(category => (
                            <motion.div
                              key={category.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-2"
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <Label className="text-sm">{category.name}</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      value={category.percentage}
                                      onChange={e =>
                                        updateCategoryPercentage(
                                          category.id,
                                          Math.max(1, Math.min(99, parseFloat(e.target.value) || 0))
                                        )
                                      }
                                      className="w-16 h-7 text-xs"
                                      disabled={percentagesLocked}
                                    />
                                  ) : (
                                    <span className="text-sm font-medium">
                                      {category.percentage}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {editMode && !percentagesLocked && (
                                <Slider
                                  value={[category.percentage]}
                                  min={1}
                                  max={99}
                                  step={1}
                                  onValueChange={values =>
                                    updateCategoryPercentage(category.id, values[0])
                                  }
                                  className="py-1"
                                />
                              )}

                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Montant alloué:</span>
                                <span>{formatEuro(category.amount)}</span>
                              </div>

                              {category.id !== categories[categories.length - 1].id && (
                                <div className="h-px bg-border my-2" />
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  {editMode && (
                    <div className="flex justify-end gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(false)}
                        className="gap-1"
                      >
                        <Cross2Icon className="h-4 w-4" />
                        Annuler
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          normalizePercentages();
                          setEditMode(false);
                        }}
                        className="gap-1"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Appliquer
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carte d'information */}
      <Card className="bg-muted/30 backdrop-blur-sm border-muted/60">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">À propos de la règle 50/30/10/10</h3>
              <p className="text-muted-foreground text-sm">
                Cette méthode de budgétisation divise vos revenus en quatre catégories principales:
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF6384]" />
                  <span>
                    <strong>50%</strong> pour les besoins essentiels (courses, logement, factures)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#36A2EB]" />
                  <span>
                    <strong>30%</strong> pour les transports et déplacements
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FFCE56]" />
                  <span>
                    <strong>10%</strong> pour les loisirs et plaisirs personnels
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4BC0C0]" />
                  <span>
                    <strong>10%</strong> pour l&apos;épargne et les investissements
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">Conseils d&apos;utilisation</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-4 w-4 mt-0.5 text-primary" />
                  <span>
                    Ajustez les pourcentages selon vos priorités et votre situation personnelle.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-4 w-4 mt-0.5 text-primary" />
                  <span>
                    Le matelas de sécurité vous permet de mettre de côté une somme fixe avant la
                    répartition.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRightIcon className="h-4 w-4 mt-0.5 text-primary" />
                  <span>
                    Utilisez les différentes visualisations pour mieux comprendre votre budget.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
