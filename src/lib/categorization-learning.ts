import { normalizeDescription } from './dedup-hash';
import { getDb } from './db';
import { listCategories } from './categories';
import { detectCategoryByKeywords } from './keyword-detector';

export type SuggestionInput = {
  paymentSourceId: string;
  description: string;
};

export type Suggestion = {
  categoryId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
};

type NormalizedInput = SuggestionInput & {
  index: number;
  normDesc: string;
  key: string;
};

const MIN_OCCURRENCES = 3;
const MAJORITY_THRESHOLD = 0.67;
const RECENT_TRANSACTION_LIMIT = 1000;
const KEY_CHUNK_SIZE = 500;

function none(reason = "Pas assez d'historique"): Suggestion {
  return { categoryId: null, confidence: 'none', reason };
}

function confidenceForRatio(ratio: number): Suggestion['confidence'] {
  if (ratio >= 0.85) return 'high';
  if (ratio >= MAJORITY_THRESHOLD) return 'medium';
  return 'low';
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function suggestCategoryBatch(inputs: SuggestionInput[]): Promise<Map<number, Suggestion>> {
  const suggestions = new Map<number, Suggestion>();
  if (inputs.length === 0) return suggestions;
  const allCategories = await listCategories();

  const normalizedInputs: NormalizedInput[] = inputs.map((input, index) => {
    const normDesc = normalizeDescription(input.description);
    return {
      ...input,
      index,
      normDesc,
      key: `${input.paymentSourceId}|${normDesc}`,
    };
  });

  const inputsBySource = new Map<string, NormalizedInput[]>();
  for (const input of normalizedInputs) {
    if (!inputsBySource.has(input.paymentSourceId)) inputsBySource.set(input.paymentSourceId, []);
    inputsBySource.get(input.paymentSourceId)?.push(input);
  }

  const suggestionByKey = new Map<string, Suggestion>();
  const db = getDb();

  for (const [paymentSourceId, sourceInputs] of inputsBySource) {
    const transactions = await db.transaction.findMany({
      where: {
        paymentSourceId,
        categoryId: { not: null },
      },
      orderBy: { date: 'desc' },
      take: RECENT_TRANSACTION_LIMIT,
      select: {
        merchantName: true,
        categoryId: true,
        category: { select: { name: true } },
      },
    });

    const transactionsByNormDesc = new Map<
      string,
      { categoryId: string; categoryName: string | null }[]
    >();

    for (const transaction of transactions) {
      if (!transaction.categoryId) continue;
      const normDesc = normalizeDescription(transaction.merchantName);
      if (!transactionsByNormDesc.has(normDesc)) transactionsByNormDesc.set(normDesc, []);
      transactionsByNormDesc.get(normDesc)?.push({
        categoryId: transaction.categoryId,
        categoryName: transaction.category?.name ?? null,
      });
    }

    const uniqueByNormDesc = new Map(sourceInputs.map((input) => [input.normDesc, input]));
    for (const chunk of chunks(Array.from(uniqueByNormDesc.values()), KEY_CHUNK_SIZE)) {
      for (const input of chunk) {
        const matches = transactionsByNormDesc.get(input.normDesc) ?? [];
        if (matches.length < MIN_OCCURRENCES) {
          suggestionByKey.set(input.key, none());
          continue;
        }

        const counts = new Map<string, { count: number; categoryName: string | null }>();
        for (const match of matches) {
          const current = counts.get(match.categoryId) ?? { count: 0, categoryName: match.categoryName };
          counts.set(match.categoryId, {
            count: current.count + 1,
            categoryName: current.categoryName ?? match.categoryName,
          });
        }

        const [topCategoryId, top] =
          Array.from(counts.entries()).sort((left, right) => right[1].count - left[1].count)[0] ?? [];

        if (!topCategoryId || !top) {
          suggestionByKey.set(input.key, none());
          continue;
        }

        const ratio = top.count / matches.length;
        if (ratio < MAJORITY_THRESHOLD) {
          suggestionByKey.set(input.key, none('Pas de majorité claire'));
          continue;
        }

        const categoryName = top.categoryName ?? topCategoryId;
        suggestionByKey.set(input.key, {
          categoryId: topCategoryId,
          confidence: confidenceForRatio(ratio),
          reason: `${top.count}/${matches.length} transactions historiques (${input.normDesc}) classées ${categoryName}`,
        });
      }
    }
  }

  for (const input of normalizedInputs) {
    const historical = suggestionByKey.get(input.key) ?? none();
    if (historical.confidence === 'none' || historical.confidence === 'low') {
      const keywordSuggestion = detectCategoryByKeywords(input.description, allCategories);
      if (keywordSuggestion.confidence === 'high' || keywordSuggestion.confidence === 'medium') {
        suggestions.set(input.index, keywordSuggestion);
        continue;
      }
    }

    suggestions.set(input.index, historical);
  }

  return suggestions;
}
