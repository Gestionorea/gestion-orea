'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { requireReconciler } from '@/lib/permissions';

export type BulkReconcileInput = {
  transactionIds: string[];
  reconciled: boolean;
};

export type BulkReconcileResult =
  | { ok: true; updatedCount: number }
  | { ok: false; error: string };

function parseTransactionIds(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string') return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export async function bulkReconcileAction(
  _prev: BulkReconcileResult | null,
  formData: FormData,
): Promise<BulkReconcileResult> {
  const session = await requireReconciler();

  let transactionIds: string[];
  try {
    transactionIds = parseTransactionIds(formData.get('transactionIds'));
  } catch {
    return { ok: false, error: 'Selection invalide.' };
  }

  if (transactionIds.length === 0) {
    return { ok: false, error: 'Aucune transaction selectionnee.' };
  }

  const reconciled = formData.get('reconciled') === 'true';
  const result = await getDb().transaction.updateMany({
    where: { id: { in: transactionIds } },
    data: {
      reconciledAt: reconciled ? new Date() : null,
      reconciledById: reconciled ? session.userId : null,
    },
  });

  revalidatePath('/fr/perso/comptabilite');
  revalidatePath('/en/perso/comptabilite');
  revalidatePath('/fr/perso/comptabilite/conciliation');
  revalidatePath('/en/perso/comptabilite/conciliation');

  return { ok: true, updatedCount: result.count };
}
