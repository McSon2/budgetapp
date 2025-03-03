'use client';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Category } from '@/lib/services/categories-service';
import { Expense } from '@/lib/services/expenses-service';
import { useState } from 'react';
import { toast } from 'sonner';
import { EditExpenseDialog } from './EditExpenseDialog';
import { UpdatedExpense } from './types';

type ModificationType = 'current' | 'future' | 'all';

export function RecurringExpenseModifierDialog({
  expense,
  onClose,
  onModified,
  categories,
}: {
  expense: Expense;
  onClose: () => void;
  onModified: () => void;
  categories: Category[]; // Use the proper Category type
}) {
  const [open, setOpen] = useState(true);
  const [modificationType, setModificationType] = useState<ModificationType>('all');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  const handleProceed = () => {
    setShowEditDialog(true);
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
  };

  const handleSaveEdit = async (id: string, updatedExpense: UpdatedExpense) => {
    setLoading(true);
    try {
      // Si l'ID contient un tiret, c'est une transaction générée
      // Il faut extraire l'ID original (première partie avant le tiret)
      let originalId = id;
      if (id.includes('-') && expense.isGenerated) {
        originalId = id.split('-')[0];
      }

      const response = await fetch('/api/expenses/recurring/modify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recurringExpenseId: originalId,
          modificationType,
          updatedExpense,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Une erreur est survenue');
      }

      toast.success('La transaction récurrente a été modifiée avec succès');
      onModified();
      setOpen(false);
    } catch (error) {
      console.error('Erreur lors de la modification de la transaction récurrente:', error);
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !showEditDialog}
        onOpenChange={isOpen => {
          setOpen(isOpen);
          if (!isOpen) handleClose();
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier une transaction récurrente</DialogTitle>
            <DialogDescription>
              Comment souhaitez-vous modifier cette transaction récurrente ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <RadioGroup
              value={modificationType}
              onValueChange={value => setModificationType(value as ModificationType)}
              className="space-y-4"
            >
              <div>
                <Card
                  className={`cursor-pointer transition ${modificationType === 'current' ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="current" id="current" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="current" className="font-medium">
                          Modifier uniquement ce mois-ci
                        </Label>
                        <CardDescription>
                          La modification s&apos;appliquera uniquement à l&apos;occurrence du mois
                          en cours. Les occurrences futures resteront inchangées.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              <div>
                <Card
                  className={`cursor-pointer transition ${modificationType === 'future' ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="future" id="future" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="future" className="font-medium">
                          Modifier à partir de ce mois-ci
                        </Label>
                        <CardDescription>
                          La modification s&apos;appliquera à l&apos;occurrence du mois en cours et
                          à toutes les occurrences futures. Les occurrences passées resteront
                          inchangées.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>

              <div>
                <Card
                  className={`cursor-pointer transition ${modificationType === 'all' ? 'ring-2 ring-primary' : 'hover:bg-accent'}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start gap-4">
                      <RadioGroupItem value="all" id="all" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="all" className="font-medium">
                          Modifier toutes les occurrences
                        </Label>
                        <CardDescription>
                          La modification s&apos;appliquera à toutes les occurrences, passées et
                          futures.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button onClick={handleProceed} disabled={loading}>
              Continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showEditDialog && (
        <EditExpenseDialog
          expense={expense}
          categories={categories}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </>
  );
}
