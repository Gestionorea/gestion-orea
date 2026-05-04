'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { listFolderItemsByPath } from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';

export type InvoiceCandidate = {
  itemId: string;
  filename: string;
  webUrl: string;
  sizeKb: number;
  lastModified: string;
  source: 'month-traitees' | 'month-pending' | 'inbox-vrac';
};

const MOIS_FR: Record<number, string> = {
  1: '01-Janvier',
  2: '02-Fevrier',
  3: '03-Mars',
  4: '04-Avril',
  5: '05-Mai',
  6: '06-Juin',
  7: '07-Juillet',
  8: '08-Aout',
  9: '09-Septembre',
  10: '10-Octobre',
  11: '11-Novembre',
  12: '12-Decembre',
};

export async function listInvoicesForMonthAction(
  year: number,
  month: number,
): Promise<{ ok: true; invoices: InvoiceCandidate[] } | { ok: false; error: string }> {
  await requireOwner();

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return { ok: false, error: 'Année invalide' };
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: 'Mois invalide' };
  }

  const monthLabel = MOIS_FR[month];
  const paths = [
    { path: `Comptabilite/${year}/${monthLabel}/Factures-Traitees`, source: 'month-traitees' as const },
    { path: `Comptabilite/${year}/${monthLabel}/Factures`, source: 'month-pending' as const },
    { path: 'Comptabilite/Factures scannées/Inbox', source: 'inbox-vrac' as const },
    { path: 'Comptabilite/Facture scanner', source: 'inbox-vrac' as const },
  ];

  const seen = new Set<string>();
  const invoices: InvoiceCandidate[] = [];

  for (const { path, source } of paths) {
    try {
      const items = await listFolderItemsByPath(path);
      for (const item of items) {
        if (item.folder || seen.has(item.id)) continue;
        seen.add(item.id);
        invoices.push({
          itemId: item.id,
          filename: item.name,
          webUrl: item.webUrl,
          sizeKb: Math.round(item.size / 1024),
          lastModified: item.lastModifiedDateTime,
          source,
        });
      }
    } catch {
      // Some month/source folders may not exist yet.
    }
  }

  invoices.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  return { ok: true, invoices };
}

export async function linkInvoiceToTransactionAction(
  transactionId: string,
  webUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireOwner();
  if (!transactionId || !webUrl) return { ok: false, error: 'Paramètres manquants' };

  try {
    await getDb().transaction.update({
      where: { id: transactionId },
      data: { attachmentUrl: webUrl },
    });
    revalidatePath('/[locale]/perso/comptabilite', 'page');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Mise à jour échouée' };
  }
}

export async function unlinkInvoiceAction(
  transactionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireOwner();
  if (!transactionId) return { ok: false, error: 'transactionId requis' };

  try {
    await getDb().transaction.update({
      where: { id: transactionId },
      data: { attachmentUrl: null },
    });
    revalidatePath('/[locale]/perso/comptabilite', 'page');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Mise à jour échouée' };
  }
}
