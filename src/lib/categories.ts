import type { CategoryType } from '@prisma/client';
import { normalizeDescription } from '@/lib/dedup-hash';
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

export function normalizeCategoryName(name: string): string {
  return normalizeDescription(name).replace(/\s+/g, '');
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

export async function findSimilarCategory(name: string): Promise<CategoryItem | null> {
  const normalized = normalizeCategoryName(name);
  if (!normalized) return null;

  const categories = await listCategories();
  return categories.find((category) => normalizeCategoryName(category.name) === normalized) ?? null;
}

export class CategoryDuplicateError extends Error {
  similarCategory: CategoryItem;

  constructor(similarCategory: CategoryItem) {
    super(`Categorie similaire existe: ${similarCategory.name}`);
    this.similarCategory = similarCategory;
  }
}

export async function createCategory(input: {
  name: string;
  type: CategoryType;
  description?: string | null;
}): Promise<CategoryItem> {
  const similar = await findSimilarCategory(input.name);
  if (similar) throw new CategoryDuplicateError(similar);

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
