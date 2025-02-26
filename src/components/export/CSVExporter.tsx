'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, subMonths } from 'date-fns';
import { DownloadIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CSVExporterProps {
  userId: string;
}

export function CSVExporter({ userId }: CSVExporterProps) {
  const [startDate, setStartDate] = useState<string>(
    format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Veuillez sélectionner une période valide');
      return;
    }

    // Vérifier que la date de début est antérieure à la date de fin
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('La date de début doit être antérieure à la date de fin');
      return;
    }

    setIsLoading(true);

    try {
      // Appeler l'API d'exportation
      const response = await fetch(
        `/api/export/csv?startDate=${startDate}&endDate=${endDate}&userId=${userId}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Une erreur est survenue lors de l'exportation");
      }

      // Récupérer le blob de données CSV
      const blob = await response.blob();

      // Créer un URL pour le téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;

      // Générer un nom de fichier avec la date actuelle
      const fileName = `transactions_${format(new Date(startDate), 'dd-MM-yyyy')}_${format(
        new Date(endDate),
        'dd-MM-yyyy'
      )}.csv`;
      a.download = fileName;

      // Déclencher le téléchargement
      document.body.appendChild(a);
      a.click();

      // Nettoyer
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Exportation réussie');
    } catch (error) {
      console.error("Erreur lors de l'exportation:", error);
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue lors de l'exportation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Exporter des transactions</CardTitle>
        <CardDescription>
          Exportez vos transactions au format CSV pour une période donnée
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleExport} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Exportation en cours...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  Exporter en CSV
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground mt-4">
            <p>Le fichier CSV exporté contiendra les colonnes suivantes :</p>
            <ul className="list-disc list-inside mt-2">
              <li>Date (format: JJ/MM/AAAA)</li>
              <li>Heure</li>
              <li>Catégorie</li>
              <li>Sous-catégorie</li>
              <li>Nom (description)</li>
              <li>Remarques</li>
              <li>Dépense (montant négatif)</li>
              <li>Rentrée (montant positif)</li>
              <li>Récurrent (Oui/Non)</li>
              <li>Fréquence (daily, weekly, monthly, yearly)</li>
              <li>Date de fin (format: JJ/MM/AAAA, optionnel)</li>
            </ul>
            <p className="mt-2">
              Ce format est compatible avec la fonction d&apos;importation CSV de
              l&apos;application.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
