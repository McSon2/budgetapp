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
  isRecurring: string;
  frequency: string;
  endDate: string;
}

export function CSVImporter({ userId }: CSVImporterProps) {
  const [csvData, setCsvData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping'>('upload');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    const file = e.target.files?.[0];
    if (!file) {
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const lines = content.split('\n');

      if (lines.length < 2) {
        toast.error('Le fichier CSV est vide ou mal formaté');
        setIsLoading(false);
        return;
      }

      // Parse CSV headers
      const headers = parseCSVLine(lines[0]);

      // Check if the CSV has the required headers
      const requiredHeaders = [
        'Date',
        'Heure',
        'Catégorie',
        'Sous-catégorie',
        'Nom',
        'Remarques',
        'Dépense',
        'Rentrée',
      ];

      // Check if at least the first 8 required headers are present
      const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));

      if (!hasRequiredHeaders) {
        toast.error('Le fichier CSV ne contient pas les en-têtes requis');
        setIsLoading(false);
        return;
      }

      // Parse CSV data
      const data: Transaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const values = parseCSVLine(line);

          // Map values to transaction object
          const transaction: Transaction = {
            date: values[headers.indexOf('Date')] || '',
            time: values[headers.indexOf('Heure')] || '',
            category: values[headers.indexOf('Catégorie')] || '',
            subcategory: values[headers.indexOf('Sous-catégorie')] || '',
            description: values[headers.indexOf('Nom')] || '',
            notes: values[headers.indexOf('Remarques')] || '',
            expense: values[headers.indexOf('Dépense')] || '',
            income: values[headers.indexOf('Rentrée')] || '',
            isRecurring: headers.includes('Récurrent')
              ? values[headers.indexOf('Récurrent')] || ''
              : '',
            frequency: headers.includes('Fréquence')
              ? values[headers.indexOf('Fréquence')] || ''
              : '',
            endDate: headers.includes('Date de fin')
              ? values[headers.indexOf('Date de fin')] || ''
              : '',
          };

          data.push(transaction);
        }
      }

      if (data.length === 0) {
        toast.error('Aucune transaction valide trouvée dans le fichier CSV');
        setIsLoading(false);
        return;
      }

      setCsvData(data);
      setStep('preview');
      setIsLoading(false);
    };

    reader.onerror = () => {
      toast.error('Erreur lors de la lecture du fichier');
      setIsLoading(false);
    };

    reader.readAsText(file);
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
