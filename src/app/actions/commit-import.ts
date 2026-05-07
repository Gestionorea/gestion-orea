'use server';

import type { PaymentMethod, PaymentSourceKind } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { computeDedupHash } from '@/lib/dedup-hash';
import { getDb } from '@/lib/db';
import { partitionImportRowsByDedup } from '@/lib/import-dedup';
import { detectInterAccountTransfer } from '@/lib/inter-account-detector';
import { extractInteracName, upsertInteracContact } from '@/lib/interac-contacts';
import { requireOwner } from '@/lib/permissions';
import { parseStatement } from '@/lib/statement-parser';

export type CommitImportResult =
  | {
      ok: true;
      importId: string;
      period: { year: number; month: number };
      importedCount: number;
      restoredCount: number;
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

function periodLinkTarget(periodStart: Date): { year: number; month: number } {
  return {
    year: periodStart.getUTCFullYear(),
    month: periodStart.getUTCMonth() + 1,
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
    const keys = Array.from(formData.keys()).join(',');
    const psLen = typeof paymentSourceId === 'string' ? paymentSourceId.length : 'N/A';
    return {
      ok: false,
      error: `PaymentSource requis (recu: type=${typeof paymentSourceId}, len=${psLen}, formKeys=[${keys}])`,
    };
  }

  if (!(file instanceof File) || file.size === 0) {
    const fileType = file instanceof File ? `File(name=${file.name}, size=${file.size})` : typeof file;
    return { ok: false, error: `Fichier requis (recu: ${fileType})` };
  }

  const db = getDb();
  const source = await db.paymentSource.findUnique({
    where: { id: paymentSourceId },
    select: { archived: true, kind: true, ownerCompanyId: true },
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
    select: { id: true, dedupHash: true, deletedAt: true },
  });
  const { rowsToCreate, rowsToRestore, duplicateCount } = partitionImportRowsByDedup(rowsWithHashes, existing);
  const importedCount = rowsToCreate.length + rowsToRestore.length;

  if (importedCount === 0) {
    return {
      ok: false,
      error: 'Tous les enregistrements sont deja en DB',
      duplicateCount,
    };
  }

  const { periodStart, periodEnd } = periodBounds(result.rows);
  const paymentMethod = defaultPaymentMethod(source.kind);
  const categorizedCount = [...rowsToCreate, ...rowsToRestore].filter(({ row }) =>
    categoryOverrides.get(row.rawRowNumber),
  ).length;

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
            rowsImported: importedCount,
            rowsDuplicate: duplicateCount,
            rowsRejected: result.rowsSkipped,
            uploadedById: session.userId,
          },
          select: { id: true },
        });

        for (const { row, dedupHash } of rowsToCreate) {
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
              companyId: source.ownerCompanyId ?? null,
              beneficiary: 'company',
              categoryId,
              createdById: session.userId,
              bankStatementImportId: bankStatementImport.id,
              dedupHash,
            },
          });
        }

        for (const { row, transactionId } of rowsToRestore) {
          const categoryId = categoryOverrides.get(row.rawRowNumber);

          await tx.transaction.update({
            where: { id: transactionId },
            data: {
              deletedAt: null,
              bankStatementImportId: bankStatementImport.id,
              ...(categoryId !== undefined ? { categoryId } : {}),
            },
          });
        }

        return bankStatementImport.id;
      },
      { timeout: 60000 },
    );
    const linkingSummary = await linkInterAccountTransfers(importId);
    try {
      for (const { row } of [...rowsToCreate, ...rowsToRestore]) {
        const categoryId = categoryOverrides.get(row.rawRowNumber);
        if (!categoryId) continue;

        const interacName = extractInteracName(row.description);
        if (!interacName) continue;

        await upsertInteracContact(interacName, categoryId);
      }
    } catch {
      // Learning is advisory; a failed contact update should not roll back a completed import.
    }

    return {
      ok: true,
      importId,
      period: periodLinkTarget(periodStart),
      importedCount,
      restoredCount: rowsToRestore.length,
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
