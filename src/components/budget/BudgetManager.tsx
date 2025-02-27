'use client';

import { useDashboard } from '@/components/providers/MonthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  CheckIcon,
  Cross2Icon,
  LockClosedIcon,
  MixerHorizontalIcon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

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

  // État pour suivre si les pourcentages sont verrouillés
  const [percentagesLocked, setPercentagesLocked] = useState(false);

  // Extraire les pourcentages des catégories pour la dépendance du useEffect
  const categoryPercentages = categories.map(c => c.percentage).join(',');

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
  }, [endOfMonthBalance, safetyCushion, categoryPercentages]);

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

  // Fonction pour ajouter une nouvelle catégorie
  const addCategory = () => {
    if (percentagesLocked) return;

    // Générer un ID unique
    const newId = (Math.max(...categories.map(c => parseInt(c.id))) + 1).toString();

    // Générer une couleur aléatoire
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    // Réduire les pourcentages existants pour faire de la place
    const newPercentage = 5;
    const totalToReduce = newPercentage;
    const currentTotal = categories.reduce((sum, c) => sum + c.percentage, 0);

    const updatedCategories = categories.map(category => ({
      ...category,
      percentage: Math.max(
        1,
        category.percentage - (category.percentage / currentTotal) * totalToReduce
      ),
    }));

    // Ajouter la nouvelle catégorie
    setCategories([
      ...updatedCategories,
      {
        id: newId,
        name: 'Nouvelle catégorie',
        percentage: newPercentage,
        color: randomColor,
        amount: 0,
      },
    ]);
  };

  // Fonction pour supprimer une catégorie
  const removeCategory = (id: string) => {
    if (percentagesLocked || categories.length <= 1) return;

    const categoryToRemove = categories.find(c => c.id === id);
    if (!categoryToRemove) return;

    const remainingCategories = categories.filter(c => c.id !== id);
    const percentageToRedistribute = categoryToRemove.percentage;
    const totalRemainingPercentage = remainingCategories.reduce((sum, c) => sum + c.percentage, 0);

    // Redistribuer le pourcentage de la catégorie supprimée
    const updatedCategories = remainingCategories.map(category => ({
      ...category,
      percentage:
        category.percentage +
        (category.percentage / totalRemainingPercentage) * percentageToRedistribute,
    }));

    setCategories(updatedCategories);
  };

  // Effet pour normaliser les pourcentages lorsqu'on quitte le mode édition
  useEffect(() => {
    if (!editMode) {
      normalizePercentages();
    }
  }, [editMode]);

  return (
    <div className="space-y-6">
      {/* Carte principale */}
      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col space-y-5 sm:space-y-6">
            {/* En-tête avec informations de solde */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Budget Prévisionnel
                </h2>
                <p className="text-sm text-muted-foreground">
                  Solde fin de mois:{' '}
                  <span className="font-semibold text-primary">
                    {formatEuro(endOfMonthBalance)}
                  </span>
                </p>
              </div>

              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className={cn(
                  'rounded-full h-9 px-4 mt-2 sm:mt-0',
                  editMode && 'bg-primary text-primary-foreground'
                )}
              >
                <MixerHorizontalIcon className="h-4 w-4 mr-2" />
                {editMode ? 'Édition' : 'Personnaliser'}
              </Button>
            </div>

            {/* Ligne d'information principale */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Matelas de sécurité */}
              <div className="bg-muted/20 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-muted/30 px-4 py-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <LockClosedIcon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="font-medium">Matelas de sécurité</h3>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
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
                          className="w-24 h-9 text-sm"
                        />
                        <span className="text-sm font-medium">€</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Label htmlFor="cushion-toggle" className="text-sm text-muted-foreground">
                          {safetyCushion.enabled ? 'Activé' : 'Désactivé'}
                        </Label>
                        <Switch
                          id="cushion-toggle"
                          checked={safetyCushion.enabled}
                          onCheckedChange={checked =>
                            setSafetyCushion(prev => ({ ...prev, enabled: checked }))
                          }
                        />
                      </div>
                    </div>

                    {safetyCushion.enabled && (
                      <div className="text-xs text-muted-foreground">
                        Cette somme sera mise de côté et ne sera pas incluse dans votre budget
                        mensuel.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Solde disponible */}
              <div className="bg-primary/5 rounded-lg p-4 shadow-sm flex flex-col justify-center items-center">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Solde disponible</h3>
                <p className="text-2xl sm:text-3xl font-bold text-primary">
                  {formatEuro(availableBalance)}
                </p>
              </div>
            </div>

            {/* Répartition du budget */}
            <div
              className={cn(
                'rounded-lg border border-muted/60 overflow-hidden mt-2',
                editMode && 'ring-1 ring-primary ring-offset-1 ring-offset-background'
              )}
            >
              <div className="bg-muted/20 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">Répartition du budget</h3>

                  {/* Contrôle de verrouillage discret */}
                  <div className="flex items-center gap-1.5">
                    <LockClosedIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <Switch
                      id="lock-toggle"
                      checked={percentagesLocked}
                      onCheckedChange={setPercentagesLocked}
                      className="scale-75 data-[state=checked]:bg-primary/70"
                    />
                  </div>
                </div>

                {editMode && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetToDefault}
                      className="h-8 w-8 p-0"
                    >
                      <ReloadIcon className="h-4 w-4" />
                    </Button>

                    <Button variant="ghost" size="sm" onClick={addCategory} className="h-8 w-8 p-0">
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-4">
                {/* Grille de cartes pour les catégories */}
                <div className="grid grid-cols-2 gap-3">
                  <AnimatePresence>
                    {categories.map(category => (
                      <motion.div
                        key={category.id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-background rounded-lg border border-border overflow-hidden flex flex-col h-full"
                      >
                        <div className="p-3 flex flex-col h-full">
                          {/* En-tête avec nom et bouton de suppression */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <Label className="text-sm font-medium">{category.name}</Label>
                            </div>

                            {editMode && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCategory(category.id)}
                                className="h-6 w-6 p-0"
                                disabled={categories.length <= 1}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

                          {/* Contenu principal centré */}
                          <div className="flex-1 flex flex-col items-center justify-center py-3">
                            <div className="text-3xl font-bold mb-1">
                              {category.percentage.toFixed(0)}%
                            </div>
                            <div className="text-sm font-medium text-muted-foreground">
                              {formatEuro(category.amount)}
                            </div>
                          </div>

                          {/* Slider en bas */}
                          {editMode && (
                            <div className="mt-auto pt-2">
                              <Slider
                                value={[category.percentage]}
                                min={1}
                                max={99}
                                step={1}
                                onValueChange={values =>
                                  updateCategoryPercentage(category.id, values[0])
                                }
                                className="py-0.5"
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Actions */}
            {editMode && (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  className="gap-1 h-8 text-xs"
                >
                  <Cross2Icon className="h-3.5 w-3.5" />
                  Annuler
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    normalizePercentages();
                    setEditMode(false);
                  }}
                  className="gap-1 h-8 text-xs"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Appliquer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
