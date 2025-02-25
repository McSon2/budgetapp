'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Définir l'interface pour les catégories
interface Category {
  id: string;
  name: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // États pour les champs du formulaire
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
      }
    }

    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation de base
    if (!description.trim()) {
      toast.error('Veuillez saisir une description');
      return;
    }

    // Récupérer la valeur du montant depuis la référence
    const amountValue = amountInputRef.current?.value;

    if (!amountValue || isNaN(parseFloat(amountValue))) {
      toast.error('Veuillez saisir un montant valide');
      return;
    }

    if (!date) {
      toast.error('Veuillez sélectionner une date');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convertir le montant en nombre négatif pour les dépenses
      const numericAmount = parseFloat(amountValue) * -1;

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          amount: numericAmount,
          date,
          categoryId: categoryId || undefined,
          isRecurring,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la dépense');
      }

      toast.success('Dépense ajoutée avec succès');
      router.push('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la création de la dépense:', error);
      toast.error('Erreur lors de la création de la dépense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Nouvelle dépense</h1>
        <Link href="/dashboard">
          <Button variant="outline">Retour au tableau de bord</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter une dépense</CardTitle>
          <CardDescription>
            Remplissez le formulaire pour ajouter une nouvelle dépense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Description de la dépense"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  ref={amountInputRef}
                  defaultValue=""
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              <Label htmlFor="recurring">Dépense récurrente</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Ajout en cours...' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
