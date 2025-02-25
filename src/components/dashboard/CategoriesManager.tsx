'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@/lib/services/categories-service';
import { PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366f1' });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Impossible de récupérer les catégories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategory.name.trim()) {
      toast.error('Le nom de la catégorie est requis');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      const addedCategory = await response.json();
      setCategories([...categories, addedCategory]);
      setNewCategory({ name: '', color: '#6366f1' });
      toast.success('Catégorie ajoutée avec succès');
    } catch (error) {
      console.error('Failed to add category:', error);
      toast.error("Impossible d'ajouter la catégorie");
    }
  };

  const handleUpdateCategory = async (id: string, updatedData: Partial<Category>) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      const updatedCategory = await response.json();
      setCategories(categories.map(category => (category.id === id ? updatedCategory : category)));
      toast.success('Catégorie mise à jour avec succès');
    } catch (error) {
      console.error('Failed to update category:', error);
      toast.error('Impossible de mettre à jour la catégorie');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir supprimer cette catégorie ? Les dépenses associées ne seront plus catégorisées.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete category');
      }

      setCategories(categories.filter(category => category.id !== id));
      toast.success('Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Impossible de supprimer la catégorie');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestion des Catégories</CardTitle>
        <CardDescription>
          Ajoutez, modifiez ou supprimez des catégories pour vos dépenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="flex items-end gap-4">
              <div className="space-y-2 flex-1">
                <Label htmlFor="categoryName">Nouvelle catégorie</Label>
                <Input
                  id="categoryName"
                  value={newCategory.name}
                  onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Nom de la catégorie"
                />
              </div>
              <div className="space-y-2 w-24">
                <Label htmlFor="categoryColor">Couleur</Label>
                <Input
                  id="categoryColor"
                  type="color"
                  value={newCategory.color}
                  onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="h-10 p-1 cursor-pointer"
                />
              </div>
              <Button type="submit" size="icon" className="mb-0.5">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </form>

            <div className="border rounded-md">
              <div className="grid grid-cols-3 bg-muted p-4 font-medium">
                <div>Nom</div>
                <div>Couleur</div>
                <div className="text-right">Actions</div>
              </div>
              {categories.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Aucune catégorie trouvée. Ajoutez des catégories pour commencer.
                </div>
              ) : (
                categories.map(category => (
                  <div key={category.id} className="grid grid-cols-3 p-4 border-t items-center">
                    <div>
                      <Input
                        value={category.name}
                        onChange={e => handleUpdateCategory(category.id, { name: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={category.color}
                        onChange={e => handleUpdateCategory(category.id, { color: e.target.value })}
                        className="w-12 h-8 p-1 cursor-pointer"
                      />
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 h-8 w-8"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
