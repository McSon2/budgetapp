'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeftIcon, CheckIcon, Loader2Icon } from 'lucide-react';

interface Transaction {
  date: string;
  time: string;
  category: string;
  subcategory: string;
  description: string;
  notes: string;
  expense: string;
  income: string;
  isRecurring: string;
  frequency: string;
  endDate: string;
}

interface CSVPreviewProps {
  data: Transaction[];
  onImport: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function CSVPreview({ data, onImport, onBack, isLoading }: CSVPreviewProps) {
  // Formater les montants pour l'affichage
  const formatAmount = (amount: string) => {
    if (!amount || amount.trim() === '') return '';

    try {
      // Supprimer les espaces et le symbole €
      const cleanAmount = amount.replace(/\s/g, '').replace('€', '').trim();

      // Remplacer la virgule par un point pour la conversion en nombre
      const numericAmount = cleanAmount.replace(',', '.');

      if (!numericAmount || isNaN(parseFloat(numericAmount))) return '';

      // Formater le montant avec le séparateur de milliers et le symbole €
      return parseFloat(numericAmount).toLocaleString('fr-FR') + ' €';
    } catch (error) {
      console.error('Erreur lors du formatage du montant:', error, amount);
      return amount; // Retourner la valeur d'origine en cas d'erreur
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-md overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Dépense</TableHead>
              <TableHead className="text-right">Rentrée</TableHead>
              <TableHead>Récurrent</TableHead>
              <TableHead>Fréquence</TableHead>
              <TableHead>Date de fin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Aucune transaction à afficher
                </TableCell>
              </TableRow>
            ) : (
              data.map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right text-destructive">
                    {transaction.expense ? formatAmount(transaction.expense) : ''}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {transaction.income ? formatAmount(transaction.income) : ''}
                  </TableCell>
                  <TableCell>{transaction.isRecurring || 'Non'}</TableCell>
                  <TableCell>{transaction.frequency || '-'}</TableCell>
                  <TableCell>{transaction.endDate || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <Button onClick={onImport} disabled={isLoading || data.length === 0}>
          {isLoading ? (
            <>
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              Importation...
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              Importer {data.length} transactions
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
