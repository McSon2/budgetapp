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
import { useEffect, useState } from 'react';

// Définir l'interface pour les catégories
interface Category {
  id: string;
  name: string;
}

export default function NewExpensePage() {
  const [categories, setCategories] = useState<Category[]>([]);

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
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Description de la dépense" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant</Label>
                <Input id="amount" type="number" step="0.01" placeholder="0.00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select>
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
              <Switch id="recurring" />
              <Label htmlFor="recurring">Dépense récurrente</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Link href="/dashboard">
                <Button variant="outline">Annuler</Button>
              </Link>
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
