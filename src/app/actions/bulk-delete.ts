'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { requireOwner } from '@/lib/permissions';

export type BulkDeleteResult =
  | { ok: true; deletedCount: number }
  | { ok: false; error: string };

function revalidateAccountingPaths() {
  revalidatePath('/fr/perso/comptabilite');
  revalidatePath('/en/perso/comptabilite');
  revalidatePath('/fr/perso/comptabilite/corbeille');
  revalidatePath('/en/perso/comptabilite/corbeille');
  revalidatePath('/fr/perso/comptabilite/conciliation');
  revalidatePath('/en/perso/comptabilite/conciliation');
}

function parseTransactionIds(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string' && id.length > 0)) {
    return null;
  }

  return parsed;
}

export async function bulkDeleteByIds(formData: FormData): Promise<BulkDeleteResult> {
  await requireOwner();

  if (formData.get('confirmation') !== 'SUPPRIMER') {
    return { ok: false, error: 'Confirmation invalide' };
  }

  let ids: string[] | null;
  try {
    ids = parseTransactionIds(formData.get('transactionIds'));
  } catch {
    return { ok: false, error: 'Format invalide' };
  }

  if (!ids || ids.length === 0) {
    return { ok: false, error: 'Aucune transaction selectionnee' };
  }

  const result = await getDb().transaction.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidateAccountingPaths();
  return { ok: true, deletedCount: result.count };
}

export async function bulkDeleteByMonth(formData: FormData): Promise<BulkDeleteResult> {
  await requireOwner();

  if (formData.get('confirmation') !== 'SUPPRIMER') {
    return { ok: false, error: 'Confirmation invalide' };
  }

  const year = Number(formData.get('year'));
  const month = Number(formData.get('month'));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: 'Annee/mois invalide' };
  }

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);
  const result = await getDb().transaction.updateMany({
    where: {
      date: { gte: periodStart, lt: periodEnd },
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  revalidateAccountingPaths();
  return { ok: true, deletedCount: result.count };
}
