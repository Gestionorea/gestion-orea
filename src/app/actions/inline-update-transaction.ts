'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { requireMutator } from '@/lib/permissions';

export type InlineUpdateResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateAccountingPaths() {
  revalidatePath('/fr/perso/comptabilite');
  revalidatePath('/en/perso/comptabilite');
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string | null,
): Promise<InlineUpdateResult> {
  await requireMutator();

  if (!transactionId) return { ok: false, error: 'ID requis' };

  if (categoryId) {
    const category = await getDb().category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) return { ok: false, error: 'Categorie introuvable' };
  }

  await getDb().transaction.update({
    where: { id: transactionId },
    data: { categoryId },
  });

  revalidateAccountingPaths();
  return { ok: true };
}

export async function updateTransactionJustification(
  transactionId: string,
  justification: string | null,
): Promise<InlineUpdateResult> {
  await requireMutator();

  if (!transactionId) return { ok: false, error: 'ID requis' };

  const trimmed = justification?.trim().slice(0, 500) ?? null;
  await getDb().transaction.update({
    where: { id: transactionId },
    data: { justification: trimmed && trimmed.length > 0 ? trimmed : null },
  });

  revalidateAccountingPaths();
  return { ok: true };
}
