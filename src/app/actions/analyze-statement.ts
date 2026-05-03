'use server';

import { computeDedupHash } from '@/lib/dedup-hash';
import { listCategories } from '@/lib/categories';
import { suggestCategoryBatch, type Suggestion } from '@/lib/categorization-learning';
import { getDb } from '@/lib/db';
import { requireOwner } from '@/lib/permissions';
import { parseStatement } from '@/lib/statement-parser';

export type PreviewCategory = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
};

export type PreviewRow = {
  rowNumber: number;
  date: string;
  description: string;
  amountTotal: string;
  type: 'income' | 'expense';
  status: 'new' | 'duplicate';
  suggestedCategoryId: string | null;
  suggestionConfidence: Suggestion['confidence'];
  suggestionReason: string;
};

export type AnalyzeStatementResult =
  | {
      ok: true;
      preview: PreviewRow[];
      warnings: string[];
      paymentSourceId: string;
      filename: string;
      categories: PreviewCategory[];
    }
  | { ok: false; error: string; warnings?: string[] };

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

async function validatePaymentSource(paymentSourceId: string): Promise<
  | { ok: true }
  | {
      ok: false;
      error: string;
    }
> {
  const source = await getDb().paymentSource.findUnique({
    where: { id: paymentSourceId },
    select: { archived: true },
  });

  if (!source) return { ok: false, error: 'Source introuvable' };
  if (source.archived) return { ok: false, error: 'Cette source de paiement est archivée' };
  return { ok: true };
}

export async function analyzeStatementAction(
  _prevState: AnalyzeStatementResult | null,
  formData: FormData,
): Promise<AnalyzeStatementResult> {
  await requireOwner();

  const paymentSourceId = formData.get('paymentSourceId');
  const file = formData.get('file');

  if (typeof paymentSourceId !== 'string' || !paymentSourceId) {
    return { ok: false, error: 'PaymentSource requis' };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Fichier requis' };
  }

  const sourceValidation = await validatePaymentSource(paymentSourceId);
  if (!sourceValidation.ok) return sourceValidation;

  let result: Awaited<ReturnType<typeof parseStatement>>;
  try {
    result = await parseStatement({
      buffer: await fileToBuffer(file),
      filename: file.name,
    });
  } catch {
    return { ok: false, error: 'Lecture du fichier impossible' };
  }

  if (result.rows.length === 0) {
    return {
      ok: false,
      error: 'Aucune ligne valide detectee',
      warnings: result.warnings,
    };
  }

  const rowsWithHashes = result.rows.map((row) => ({
    row,
    dedupHash: computeDedupHash({
      date: row.date,
      amountTotal: row.amountTotal,
      description: row.description,
      paymentSourceId,
    }),
  }));

  const existing = await getDb().transaction.findMany({
    where: { dedupHash: { in: rowsWithHashes.map((row) => row.dedupHash) } },
    select: { dedupHash: true },
  });
  const existingHashes = new Set(existing.map((row) => row.dedupHash).filter(Boolean));
  const [suggestions, categories] = await Promise.all([
    suggestCategoryBatch(
      result.rows.map((row) => ({
        paymentSourceId,
        description: row.description,
      })),
    ),
    listCategories(),
  ]);

  return {
    ok: true,
    preview: rowsWithHashes.map(({ row, dedupHash }, index) => {
      const suggestion = suggestions.get(index) ?? {
        categoryId: null,
        confidence: 'none' as const,
        reason: "Pas assez d'historique",
      };

      return {
        rowNumber: row.rawRowNumber,
        date: row.date.toISOString().slice(0, 10),
        description: row.description,
        amountTotal: row.amountTotal.toFixed(2),
        type: row.type,
        status: existingHashes.has(dedupHash) ? 'duplicate' : 'new',
        suggestedCategoryId: suggestion.categoryId,
        suggestionConfidence: suggestion.confidence,
        suggestionReason: suggestion.reason,
      };
    }),
    warnings: result.warnings,
    paymentSourceId,
    filename: file.name,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      type: category.type,
    })),
  };
}
