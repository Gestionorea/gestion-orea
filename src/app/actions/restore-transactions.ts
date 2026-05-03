'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { requireOwner } from '@/lib/permissions';

export type TrashActionResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

function parseTransactionIds(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string' && id.length > 0)) {
    return null;
  }

  return parsed;
}

function revalidateTrashPaths() {
  revalidatePath('/fr/perso/comptabilite');
  revalidatePath('/en/perso/comptabilite');
  revalidatePath('/fr/perso/comptabilite/corbeille');
  revalidatePath('/en/perso/comptabilite/corbeille');
}

export async function restoreTransactionsAction(formData: FormData): Promise<TrashActionResult> {
  await requireOwner();

  let ids: string[] | null;
  try {
    ids = parseTransactionIds(formData.get('transactionIds'));
  } catch {
    return { ok: false, error: 'Format invalide' };
  }

  if (!ids || ids.length === 0) {
    return { ok: false, error: 'Aucune selection' };
  }

  const result = await getDb().transaction.updateMany({
    where: { id: { in: ids }, deletedAt: { not: null } },
    data: { deletedAt: null },
  });

  revalidateTrashPaths();
  return { ok: true, count: result.count };
}

export async function hardDeleteFromTrashAction(formData: FormData): Promise<TrashActionResult> {
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
    return { ok: false, error: 'Aucune selection' };
  }

  const result = await getDb().transaction.deleteMany({
    where: { id: { in: ids }, deletedAt: { not: null } },
  });

  revalidateTrashPaths();
  return { ok: true, count: result.count };
}
