import { normalizeDescription } from './dedup-hash';
import { getDb } from './db';
import { listCategories } from './categories';
import { detectCategoryByKeywords, isInterAccountAdvanceDescription } from './keyword-detector';
import { extractInteracName, findInteracContact } from './interac-contacts';

export type SuggestionInput = {
  paymentSourceId: string;
  description: string;
};

export type Suggestion = {
  categoryId: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
  context?: {
    historicalCount?: number;
    interacContactName?: string;
    isInterAccountAdvance?: boolean;
  };
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

function none(reason = "Pas assez d'historique", context?: Suggestion['context']): Suggestion {
  return { categoryId: null, confidence: 'none', reason, context };
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
        const context: Suggestion['context'] =
          matches.length > 0 ? { historicalCount: matches.length } : undefined;
        if (matches.length < MIN_OCCURRENCES) {
          suggestionByKey.set(input.key, none(undefined, context));
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
          suggestionByKey.set(input.key, none(undefined, context));
          continue;
        }

        const ratio = top.count / matches.length;
        if (ratio < MAJORITY_THRESHOLD) {
          suggestionByKey.set(input.key, none('Pas de majorité claire', context));
          continue;
        }

        const categoryName = top.categoryName ?? topCategoryId;
        suggestionByKey.set(input.key, {
          categoryId: topCategoryId,
          confidence: confidenceForRatio(ratio),
          reason: `${top.count}/${matches.length} transactions historiques (${input.normDesc}) classées ${categoryName}`,
          context,
        });
      }
    }
  }

  const interacContactByName = new Map<string, Awaited<ReturnType<typeof findInteracContact>>>();

  for (const input of normalizedInputs) {
    const historical = suggestionByKey.get(input.key) ?? none();
    const context: Suggestion['context'] = { ...(historical.context ?? {}) };

    if (isInterAccountAdvanceDescription(input.description)) {
      context.isInterAccountAdvance = true;
    }

    if (historical.confidence !== 'none' && historical.confidence !== 'low') {
      suggestions.set(input.index, { ...historical, context });
      continue;
    }

    const interacName = extractInteracName(input.description);
    if (interacName) {
      context.interacContactName = interacName;
      if (!interacContactByName.has(interacName)) {
        interacContactByName.set(interacName, await findInteracContact(interacName));
      }

      const contact = interacContactByName.get(interacName);
      if (contact?.defaultCategoryId) {
        suggestions.set(input.index, {
          categoryId: contact.defaultCategoryId,
          confidence: 'high',
          reason: `Contact Interac connu (${contact.occurrences} occurrences)`,
          context,
        });
        continue;
      }
    }

    if (historical.confidence === 'none' || historical.confidence === 'low') {
      const keywordSuggestion = detectCategoryByKeywords(input.description, allCategories);
      if (keywordSuggestion.confidence === 'high' || keywordSuggestion.confidence === 'medium') {
        suggestions.set(input.index, { ...keywordSuggestion, context });
        continue;
      }
    }

    suggestions.set(input.index, { ...historical, context });
  }

  return suggestions;
}
