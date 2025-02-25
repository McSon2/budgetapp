'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { CSVPreview } from './CSVPreview';

interface CSVImporterProps {
  userId: string;
}

interface Transaction {
  date: string;
  time: string;
  category: string;
  subcategory: string;
  description: string;
  notes: string;
  expense: string;
  income: string;
}

export function CSVImporter({ userId }: CSVImporterProps) {
  const [csvData, setCsvData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping'>('upload');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      parseCSV(selectedFile);
    }
  };

  // Fonction pour analyser une ligne CSV en tenant compte des guillemets
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Ajouter le dernier champ
    result.push(current);

    return result;
  };

  const parseCSV = async (file: File) => {
    setIsLoading(true);

    try {
      const text = await file.text();
      const lines = text.split('\n');

      // Filtrer les lignes vides et les commentaires
      const dataLines = lines.filter(line => line.trim() !== '' && !line.startsWith('#'));

      if (dataLines.length === 0) {
        throw new Error('Le fichier CSV ne contient pas de données valides');
      }

      // Extraire les en-têtes
      const headers = parseCSVLine(dataLines[0]);

      // Vérifier si les en-têtes correspondent au format attendu
      const expectedHeaders = [
        'Date',
        'Heure',
        'Catégorie',
        'Sous-catégorie',
        'Nom',
        'Remarques',
        'Dépense',
        'Rentrée',
      ];

      // Vérification plus souple des en-têtes
      const isValidFormat = expectedHeaders.length === headers.length;

      if (!isValidFormat) {
        console.error('En-têtes trouvés:', headers);
        throw new Error(
          `Le format du fichier CSV ne correspond pas au format attendu. Attendu: ${expectedHeaders.join(', ')}, Trouvé: ${headers.join(', ')}`
        );
      }

      // Extraire les données
      const parsedData: Transaction[] = [];

      for (let i = 1; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        if (values.length === headers.length) {
          const transaction: Transaction = {
            date: values[0].trim(),
            time: values[1].trim(),
            category: values[2].trim(),
            subcategory: values[3].trim(),
            description: values[4].trim(),
            notes: values[5].trim(),
            expense: values[6].trim(),
            income: values[7].trim(),
          };

          // Vérifier que la transaction a au moins une date et un montant
          if (transaction.date && (transaction.expense || transaction.income)) {
            parsedData.push(transaction);
          }
        } else {
          console.warn(`Ligne ignorée (nombre de colonnes incorrect): ${line}`);
        }
      }

      console.log(`Transactions analysées: ${parsedData.length}`);

      if (parsedData.length === 0) {
        throw new Error('Aucune transaction valide trouvée dans le fichier CSV');
      }

      setCsvData(parsedData);
      setStep('preview');
    } catch (error) {
      console.error("Erreur lors de l'analyse du fichier CSV:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors de l'analyse du fichier CSV"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/import/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          transactions: csvData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Une erreur est survenue lors de l'importation");
      }

      const result = await response.json();

      toast.success(`${result.imported} transactions ont été importées avec succès.`);

      // Rediriger vers le dashboard après l'importation
      router.push('/dashboard');
    } catch (error) {
      console.error("Erreur lors de l'importation:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de l&apos;importation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Importer des transactions</CardTitle>
        <CardDescription>Importez vos transactions à partir d&apos;un fichier CSV</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" value={step}>
          <TabsList className="mb-4">
            <TabsTrigger value="upload">Téléchargement</TabsTrigger>
            <TabsTrigger value="preview" disabled={csvData.length === 0}>
              Aperçu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Fichier CSV</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Le fichier CSV doit contenir les colonnes suivantes :</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Date (format: JJ/MM/AAAA)</li>
                  <li>Heure</li>
                  <li>Catégorie</li>
                  <li>Sous-catégorie</li>
                  <li>Nom (description)</li>
                  <li>Remarques</li>
                  <li>Dépense (montant négatif)</li>
                  <li>Rentrée (montant positif)</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <CSVPreview
              data={csvData}
              onImport={handleImport}
              isLoading={isLoading}
              onBack={() => setStep('upload')}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
