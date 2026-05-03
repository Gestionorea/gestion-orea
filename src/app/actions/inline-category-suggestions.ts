'use server';

import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/permissions';
import { listCategories, type CategoryItem } from '@/lib/categories';
import { normalizeDescription } from '@/lib/dedup-hash';
import { detectCategoryByKeywords } from '@/lib/keyword-detector';
import { extractInteracName, findInteracContact } from '@/lib/interac-contacts';

export type InlineSuggestionInput = {
  transactionId: string;
};

export type InlineSuggestionCategory = Pick<CategoryItem, 'id' | 'name' | 'type'>;

export type InlineSuggestion = {
  category: InlineSuggestionCategory;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

type RawSuggestion = {
  categoryId: string;
  confidence: InlineSuggestion['confidence'];
  reasons: string[];
  score: number;
  occurrences: number;
};

const CONFIDENCE_ORDER: Record<InlineSuggestion['confidence'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const STOPWORDS = new Set([
  'paiement',
  'virement',
  'frais',
  'mobile',
  'depot',
  'achat',
  'desjardins',
  'visa',
  'mastercard',
  'mc',
  'inc',
  'ltee',
  'enr',
  'pour',
  'avec',
  'par',
  'sur',
  'sous',
  'dans',
  'aux',
  'les',
  'des',
]);

function toSuggestionCategory(category: CategoryItem): InlineSuggestionCategory {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
  };
}

function extractDistinctiveKeywords(description: string, max = 3): string[] {
  const normalized = normalizeDescription(description);
  const words = normalized
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));

  return Array.from(new Set(words))
    .sort((left, right) => right.length - left.length)
    .slice(0, max);
}

function mergeSuggestions(suggestions: RawSuggestion[]): RawSuggestion[] {
  const merged = new Map<string, RawSuggestion>();

  for (const suggestion of suggestions) {
    const existing = merged.get(suggestion.categoryId);
    if (!existing) {
      merged.set(suggestion.categoryId, {
        ...suggestion,
        reasons: [...suggestion.reasons],
      });
      continue;
    }

    if (CONFIDENCE_ORDER[suggestion.confidence] > CONFIDENCE_ORDER[existing.confidence]) {
      existing.confidence = suggestion.confidence;
    }

    for (const reason of suggestion.reasons) {
      if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    }

    existing.score += suggestion.score;
    existing.occurrences += suggestion.occurrences;
  }

  return Array.from(merged.values());
}

function sortSuggestions(left: RawSuggestion, right: RawSuggestion): number {
  const confidenceDelta = CONFIDENCE_ORDER[right.confidence] - CONFIDENCE_ORDER[left.confidence];
  if (confidenceDelta !== 0) return confidenceDelta;

  const occurrenceDelta = right.occurrences - left.occurrences;
  if (occurrenceDelta !== 0) return occurrenceDelta;

  return right.score - left.score;
}

function categoryById(categories: CategoryItem[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

async function topUsedCategoryIds({
  paymentSourceId,
  excludedIds,
  compatibleCategoryIds,
  take,
}: {
  paymentSourceId?: string | null;
  excludedIds?: string[];
  compatibleCategoryIds?: string[];
  take: number;
}) {
  if (take <= 0) return [];
  if (compatibleCategoryIds && compatibleCategoryIds.length === 0) return [];

  const rows = await getDb().transaction.groupBy({
    by: ['categoryId'],
    where: {
      paymentSourceId: paymentSourceId ?? undefined,
      categoryId: {
        not: null,
        notIn: excludedIds ?? [],
        in: compatibleCategoryIds,
      },
    },
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: 'desc' } },
    take,
  });

  return rows.map((row) => ({
    categoryId: row.categoryId,
    count: row._count.categoryId,
  })).filter((row): row is { categoryId: string; count: number } => row.categoryId !== null);
}

export async function getInlineCategorySuggestions(
  input: InlineSuggestionInput,
): Promise<{ ok: true; suggestions: InlineSuggestion[] } | { ok: false; error: string }> {
  await requireAuth();

  if (!input.transactionId) return { ok: false, error: 'transactionId requis' };

  const db = getDb();
  const tx = await db.transaction.findUnique({
    where: { id: input.transactionId },
    select: {
      id: true,
      merchantName: true,
      paymentSourceId: true,
      type: true,
      amountTotal: true,
    },
  });

  if (!tx) return { ok: true, suggestions: [] };

  const allCategories = await listCategories();
  if (allCategories.length === 0) return { ok: true, suggestions: [] };

  const rawSuggestions: RawSuggestion[] = [];

  const interacName = extractInteracName(tx.merchantName);
  if (interacName) {
    const contact = await findInteracContact(interacName);
    if (contact?.defaultCategoryId) {
      rawSuggestions.push({
        categoryId: contact.defaultCategoryId,
        confidence: 'high',
        reasons: [`Contact Interac connu (${contact.occurrences} occurrences)`],
        score: 100,
        occurrences: contact.occurrences,
      });
    }
  }

  const keywordResult = detectCategoryByKeywords(tx.merchantName, allCategories);
  if (keywordResult.categoryId && (keywordResult.confidence === 'high' || keywordResult.confidence === 'medium')) {
    rawSuggestions.push({
      categoryId: keywordResult.categoryId,
      confidence: keywordResult.confidence,
      reasons: [keywordResult.reason],
      score: keywordResult.confidence === 'high' ? 80 : 50,
      occurrences: keywordResult.confidence === 'high' ? 3 : 1,
    });
  }

  if (tx.paymentSourceId) {
    const keywords = extractDistinctiveKeywords(tx.merchantName);
    if (keywords.length > 0) {
      const historicalMatches = await db.transaction.findMany({
        where: {
          paymentSourceId: tx.paymentSourceId,
          categoryId: { not: null },
          id: { not: tx.id },
          OR: keywords.map((keyword) => ({
            merchantName: { contains: keyword, mode: 'insensitive' },
          })),
        },
        select: { categoryId: true },
        take: 50,
      });

      const counts = new Map<string, number>();
      for (const match of historicalMatches) {
        if (!match.categoryId) continue;
        counts.set(match.categoryId, (counts.get(match.categoryId) ?? 0) + 1);
      }

      const topHistorical = Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1])
        .filter(([, count]) => count >= 2)
        .slice(0, 2);

      for (const [categoryId, count] of topHistorical) {
        rawSuggestions.push({
          categoryId,
          confidence: 'medium',
          reasons: [`${count} tx similaires`],
          score: 30 + count * 5,
          occurrences: count,
        });
      }
    }
  }

  if (tx.paymentSourceId) {
    const amountNumber = Number(tx.amountTotal);
    if (Number.isFinite(amountNumber) && amountNumber > 0) {
      const amountMatches = await db.transaction.findMany({
        where: {
          paymentSourceId: tx.paymentSourceId,
          categoryId: { not: null },
          id: { not: tx.id },
          amountTotal: {
            gte: amountNumber * 0.95,
            lte: amountNumber * 1.05,
          },
        },
        select: { categoryId: true },
        take: 50,
      });

      const counts = new Map<string, number>();
      for (const match of amountMatches) {
        if (!match.categoryId) continue;
        counts.set(match.categoryId, (counts.get(match.categoryId) ?? 0) + 1);
      }

      const topAmount = Array.from(counts.entries())
        .sort((left, right) => right[1] - left[1])
        .filter(([, count]) => count >= 2)
        .slice(0, 2);

      for (const [categoryId, count] of topAmount) {
        rawSuggestions.push({
          categoryId,
          confidence: 'low',
          reasons: [`${count} tx de montant similaire`],
          score: 15 + count * 3,
          occurrences: count,
        });
      }
    }
  }

  const compatibleCategoryIds = allCategories
    .filter((category) => category.type === 'both' || category.type === tx.type)
    .map((category) => category.id);
  const typeMatches = await topUsedCategoryIds({
    compatibleCategoryIds,
    take: 3,
  });

  for (const match of typeMatches) {
    rawSuggestions.push({
      categoryId: match.categoryId,
      confidence: 'low',
      reasons: ['Categorie du bon type'],
      score: 8 + match.count,
      occurrences: match.count,
    });
  }

  const categoriesById = categoryById(allCategories);
  const finalSuggestions = mergeSuggestions(rawSuggestions)
    .sort(sortSuggestions)
    .slice(0, 5)
    .map((suggestion) => {
      const category = categoriesById.get(suggestion.categoryId);
      if (!category) return null;

      return {
        category: toSuggestionCategory(category),
        confidence: suggestion.confidence,
        reason: suggestion.reasons.join(' · '),
      };
    })
    .filter((suggestion): suggestion is InlineSuggestion => suggestion !== null);

  if (finalSuggestions.length < 5 && tx.paymentSourceId) {
    const excludedIds = finalSuggestions.map((suggestion) => suggestion.category.id);
    const fallbackIds = await topUsedCategoryIds({
      paymentSourceId: tx.paymentSourceId,
      excludedIds,
      take: 5 - finalSuggestions.length,
    });

    for (const fallback of fallbackIds) {
      const category = categoriesById.get(fallback.categoryId);
      if (!category) continue;

      finalSuggestions.push({
        category: toSuggestionCategory(category),
        confidence: 'low',
        reason: 'Souvent utilisee sur ce compte',
      });
    }
  }

  return { ok: true, suggestions: finalSuggestions.slice(0, 5) };
}
