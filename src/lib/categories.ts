import type { CategoryType } from '@prisma/client';
import { getDb } from '@/lib/db';

export const CATEGORY_TYPES: CategoryType[] = ['income', 'expense', 'both'];

export type CategoryItem = {
  id: string;
  name: string;
  type: CategoryType;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const categorySelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function isCategoryType(value: string): value is CategoryType {
  return CATEGORY_TYPES.includes(value as CategoryType);
}

export async function listCategories(): Promise<CategoryItem[]> {
  return await getDb().category.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
    select: categorySelect,
  });
}

export async function getCategoryById(id: string): Promise<CategoryItem | null> {
  return await getDb().category.findUnique({
    where: { id },
    select: categorySelect,
  });
}

export async function createCategory(input: {
  name: string;
  type: CategoryType;
  description?: string | null;
}): Promise<CategoryItem> {
  return await getDb().category.create({
    data: {
      name: input.name.trim(),
      type: input.type,
      description: input.description?.trim() || null,
    },
    select: categorySelect,
  });
}

export async function updateCategory(
  id: string,
  input: { name: string; type: CategoryType; description?: string | null },
): Promise<CategoryItem> {
  return await getDb().category.update({
    where: { id },
    data: {
      name: input.name.trim(),
      type: input.type,
      description: input.description?.trim() || null,
    },
    select: categorySelect,
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await getDb().category.delete({ where: { id } });
}
