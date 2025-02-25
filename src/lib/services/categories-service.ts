import { prisma } from '@/lib/prisma';

export type Category = {
  id: string;
  name: string;
  color: string;
  icon?: string;
};

export async function getCategories(userId: string): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });

  return categories.map(category => ({
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon || undefined,
  }));
}

export async function addCategory(
  userId: string,
  category: Omit<Category, 'id'>
): Promise<Category> {
  const newCategory = await prisma.category.create({
    data: {
      name: category.name,
      color: category.color,
      icon: category.icon,
      userId,
    },
  });

  return {
    id: newCategory.id,
    name: newCategory.name,
    color: newCategory.color,
    icon: newCategory.icon || undefined,
  };
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category> {
  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      name: category.name,
      color: category.color,
      icon: category.icon,
    },
  });

  return {
    id: updatedCategory.id,
    name: updatedCategory.name,
    color: updatedCategory.color,
    icon: updatedCategory.icon || undefined,
  };
}

export async function deleteCategory(id: string): Promise<void> {
  // Vérifier si des dépenses utilisent cette catégorie
  const expensesCount = await prisma.expense.count({
    where: { categoryId: id },
  });

  if (expensesCount > 0) {
    // Mettre à jour les dépenses pour qu'elles n'aient plus de catégorie
    await prisma.expense.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
  }

  // Supprimer la catégorie
  await prisma.category.delete({
    where: { id },
  });
}
