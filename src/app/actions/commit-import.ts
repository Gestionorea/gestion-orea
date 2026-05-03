'use server';

import type { PaymentMethod, PaymentSourceKind } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { computeDedupHash } from '@/lib/dedup-hash';
import { getDb } from '@/lib/db';
import { detectInterAccountTransfer } from '@/lib/inter-account-detector';
import { requireOwner } from '@/lib/permissions';
import { parseStatement } from '@/lib/statement-parser';

export type CommitImportResult =
  | {
      ok: true;
      importId: string;
      importedCount: number;
      duplicateCount: number;
      categorizedCount: number;
      linkingSummary: { linked: number; unmatched: number };
    }
  | { ok: false; error: string; duplicateCount?: number };

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function defaultPaymentMethod(kind: PaymentSourceKind): PaymentMethod {
  if (kind === 'card') return 'credit_card';
  if (kind === 'bank_account') return 'preauthorized_debit';
  return 'other';
}

function periodBounds(rows: { date: Date }[]): { periodStart: Date; periodEnd: Date } {
  const timestamps = rows.map((row) => row.date.getTime());
  return {
    periodStart: new Date(Math.min(...timestamps)),
    periodEnd: new Date(Math.max(...timestamps)),
  };
}

function parseCategoryOverrides(value: FormDataEntryValue | null): Map<number, string | null> {
  if (typeof value !== 'string' || !value.trim()) return new Map();

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map();

    return new Map(
      Object.entries(parsed).flatMap<[number, string | null]>(([rowNumber, categoryId]) => {
        const numericRowNumber = Number(rowNumber);
        if (!Number.isInteger(numericRowNumber)) return [];
        if (categoryId === null || categoryId === '') return [[numericRowNumber, null]];
        if (typeof categoryId === 'string') return [[numericRowNumber, categoryId]];
        return [];
      }),
    );
  } catch {
    return new Map();
  }
}

async function linkInterAccountTransfers(importId: string): Promise<{ linked: number; unmatched: number }> {
  const db = getDb();
  const newlyCreated = await db.transaction.findMany({
    where: { bankStatementImportId: importId },
    select: {
      id: true,
      paymentSourceId: true,
      date: true,
      amountTotal: true,
      merchantName: true,
      type: true,
      isAdvance: true,
      reimbursementTransactionId: true,
    },
  });
  const linkingSummary = { linked: 0, unmatched: 0 };

  for (const newTx of newlyCreated) {
    if (!newTx.paymentSourceId || newTx.isAdvance || newTx.reimbursementTransactionId) {
      linkingSummary.unmatched += 1;
      continue;
    }

    const match = await detectInterAccountTransfer({
      newTransactionId: newTx.id,
      paymentSourceId: newTx.paymentSourceId,
      date: newTx.date,
      amountTotal: Math.round(Number(newTx.amountTotal) * 100),
      description: newTx.merchantName,
      type: newTx.type,
    });

    if (!match) {
      linkingSummary.unmatched += 1;
      continue;
    }

    const sourceTransactionId = newTx.type === 'expense' ? newTx.id : match.matchedTransactionId;
    const destinationTransactionId = newTx.type === 'expense' ? match.matchedTransactionId : newTx.id;

    try {
      await db.transaction.update({
        where: { id: sourceTransactionId },
        data: {
          isAdvance: true,
          reimbursementTransactionId: destinationTransactionId,
          reimbursedAt: newTx.date,
        },
      });
      linkingSummary.linked += 1;
    } catch {
      linkingSummary.unmatched += 1;
    }
  }

  return linkingSummary;
}

export async function commitImportAction(
  _prevState: CommitImportResult | null,
  formData: FormData,
): Promise<CommitImportResult> {
  const session = await requireOwner();

  const paymentSourceId = formData.get('paymentSourceId');
  const file = formData.get('file');
  const categoryOverrides = parseCategoryOverrides(formData.get('categoryOverrides'));

  if (typeof paymentSourceId !== 'string' || !paymentSourceId) {
    return { ok: false, error: 'PaymentSource requis' };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Fichier requis' };
  }

  const db = getDb();
  const source = await db.paymentSource.findUnique({
    where: { id: paymentSourceId },
    select: { archived: true, kind: true },
  });

  if (!source) return { ok: false, error: 'Source introuvable' };
  if (source.archived) return { ok: false, error: 'Cette source de paiement est archivée' };

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
    return { ok: false, error: 'Aucune ligne valide detectee' };
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

  const existing = await db.transaction.findMany({
    where: { dedupHash: { in: rowsWithHashes.map((row) => row.dedupHash) } },
    select: { dedupHash: true },
  });
  const existingHashes = new Set(existing.map((row) => row.dedupHash).filter(Boolean));
  const rowsToImport = rowsWithHashes.filter(({ dedupHash }) => !existingHashes.has(dedupHash));
  const duplicateCount = result.rows.length - rowsToImport.length;

  if (rowsToImport.length === 0) {
    return {
      ok: false,
      error: 'Tous les enregistrements sont deja en DB',
      duplicateCount,
    };
  }

  const { periodStart, periodEnd } = periodBounds(result.rows);
  const paymentMethod = defaultPaymentMethod(source.kind);
  const categorizedCount = rowsToImport.filter(({ row }) => categoryOverrides.get(row.rawRowNumber)).length;

  try {
    const importId = await db.$transaction(
      async (tx) => {
        const bankStatementImport = await tx.bankStatementImport.create({
          data: {
            paymentSourceId,
            filename: file.name,
            periodStart,
            periodEnd,
            rowsTotal: result.rows.length,
            rowsImported: rowsToImport.length,
            rowsDuplicate: duplicateCount,
            rowsRejected: result.rowsSkipped,
            uploadedById: session.userId,
          },
          select: { id: true },
        });

        for (const { row, dedupHash } of rowsToImport) {
          const categoryId = categoryOverrides.get(row.rawRowNumber) ?? null;

          await tx.transaction.create({
            data: {
              type: row.type,
              date: row.date,
              merchantName: row.description.slice(0, 200),
              amountBeforeTax: row.amountTotal,
              gst: null,
              qst: null,
              amountTotal: row.amountTotal,
              taxRegime: 'manual',
              paymentMethod,
              paymentSourceId,
              beneficiary: 'company',
              categoryId,
              createdById: session.userId,
              bankStatementImportId: bankStatementImport.id,
              dedupHash,
            },
          });
        }

        return bankStatementImport.id;
      },
      { timeout: 60000 },
    );
    const linkingSummary = await linkInterAccountTransfers(importId);

    return {
      ok: true,
      importId,
      importedCount: rowsToImport.length,
      duplicateCount,
      categorizedCount,
      linkingSummary,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        ok: false,
        error: 'Conflit de dedupHash: une transaction identique existe deja.',
        duplicateCount,
      };
    }

    return { ok: false, error: 'Échec de la création des transactions', duplicateCount };
  }
}
