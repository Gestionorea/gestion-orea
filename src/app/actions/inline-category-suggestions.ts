'use server';

import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/permissions';
import { listCategories, type CategoryItem } from '@/lib/categories';
import { suggestCategoryBatch } from '@/lib/categorization-learning';

export type InlineSuggestionInput = {
  transactionId: string;
};

export type InlineSuggestionCategory = Pick<CategoryItem, 'id' | 'name' | 'type'>;

export type InlineSuggestion = {
  category: InlineSuggestionCategory;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

function toSuggestionCategory(category: CategoryItem): InlineSuggestionCategory {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
  };
}

function validConfidence(value: string): value is InlineSuggestion['confidence'] {
  return value === 'high' || value === 'medium' || value === 'low';
}

function orderedCategoriesByIds(categories: CategoryItem[], ids: string[]): CategoryItem[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return ids.map((id) => categoryById.get(id)).filter((category): category is CategoryItem => Boolean(category));
}

async function topUsedCategories(excludedIds: string[] = [], paymentSourceId?: string | null) {
  const rows = await getDb().transaction.groupBy({
    by: ['categoryId'],
    where: {
      paymentSourceId: paymentSourceId ?? undefined,
      categoryId: {
        not: null,
        notIn: excludedIds,
      },
    },
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: 'desc' } },
    take: 5,
  });

  return rows.map((row) => row.categoryId).filter((id): id is string => id !== null);
}

export async function getInlineCategorySuggestions(
  input: InlineSuggestionInput,
): Promise<{ ok: true; suggestions: InlineSuggestion[] } | { ok: false; error: string }> {
  await requireAuth();

  if (!input.transactionId) return { ok: false, error: 'transactionId requis' };

  const tx = await getDb().transaction.findUnique({
    where: { id: input.transactionId },
    select: { merchantName: true, paymentSourceId: true },
  });

  if (!tx?.paymentSourceId) {
    return { ok: true, suggestions: [] };
  }

  const allCategories = await listCategories();
  const batchResult = await suggestCategoryBatch([
    { paymentSourceId: tx.paymentSourceId, description: tx.merchantName },
  ]);
  const suggestion = batchResult.get(0);

  if (!suggestion?.categoryId || !validConfidence(suggestion.confidence)) {
    const categoryIds = await topUsedCategories();
    const categories = orderedCategoriesByIds(allCategories, categoryIds);

    return {
      ok: true,
      suggestions: categories.map((category) => ({
        category: toSuggestionCategory(category),
        confidence: 'low',
        reason: 'Categorie frequemment utilisee',
      })),
    };
  }

  const primaryCategory = allCategories.find((category) => category.id === suggestion.categoryId);
  if (!primaryCategory) return { ok: true, suggestions: [] };

  const alternativeIds = await topUsedCategories([primaryCategory.id], tx.paymentSourceId);
  const alternatives = orderedCategoriesByIds(allCategories, alternativeIds);

  return {
    ok: true,
    suggestions: [
      {
        category: toSuggestionCategory(primaryCategory),
        confidence: suggestion.confidence,
        reason: suggestion.reason,
      },
      ...alternatives.map((category) => ({
        category: toSuggestionCategory(category),
        confidence: 'low' as const,
        reason: 'Souvent utilisee sur ce compte',
      })),
    ].slice(0, 5),
  };
}
