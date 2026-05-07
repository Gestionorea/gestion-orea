'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/db';
import { getItemById, listFolderItemsByPath, type OneDriveFileItem } from '@/lib/onedrive';
import {
  filterInvoiceItems,
  isInvoiceFile,
  monthInvoiceFolderPath,
} from '@/lib/onedrive-invoices';
import { requireMutator } from '@/lib/permissions';

export type SearchInvoicesState =
  | { ok: true; items: OneDriveFileItem[]; error?: undefined }
  | { ok: false; items: OneDriveFileItem[]; error: string };

export type LinkInvoiceState =
  | { ok: true; error?: undefined }
  | { ok: false; error: string };

const SCANNER_FOLDER = 'Comptabilite/Facture scanner';
const MAX_RESULTS = 50;

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function processedFolderFor(monthFolder: string): string {
  return monthFolder.replace(/\/Factures$/u, '/Factures-Traitees');
}

async function transactionDate(transactionId: string): Promise<Date | null> {
  const transaction = await getDb().transaction.findFirst({
    where: { id: transactionId, deletedAt: null },
    select: { date: true },
  });
  return transaction?.date ?? null;
}

function revalidateTransaction(transactionId: string): void {
  revalidatePath('/fr/perso/comptabilite');
  revalidatePath('/en/perso/comptabilite');
  revalidatePath(`/fr/perso/comptabilite/${transactionId}`);
  revalidatePath(`/en/perso/comptabilite/${transactionId}`);
}

export async function searchOneDriveInvoicesAction(
  _prevState: SearchInvoicesState | null,
  formData: FormData,
): Promise<SearchInvoicesState> {
  await requireMutator();

  const transactionId = getString(formData, 'transactionId');
  const query = getString(formData, 'query');
  const date = await transactionDate(transactionId);
  if (!date) return { ok: false, items: [], error: 'Transaction introuvable' };

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const monthFolder = monthInvoiceFolderPath(year, month);

  try {
    const folders = [SCANNER_FOLDER, monthFolder, processedFolderFor(monthFolder)];
    const folderItems = await Promise.all(folders.map((folder) => listFolderItemsByPath(folder)));
    const itemsById = new Map(folderItems.flat().map((item) => [item.id, item]));
    const items = filterInvoiceItems([...itemsById.values()], query).slice(0, MAX_RESULTS);
    return { ok: true, items };
  } catch {
    return {
      ok: false,
      items: [],
      error: 'Connexion OneDrive impossible pour le moment.',
    };
  }
}

export async function linkOneDriveInvoiceAction(formData: FormData): Promise<LinkInvoiceState> {
  await requireMutator();

  const transactionId = getString(formData, 'transactionId');
  const itemId = getString(formData, 'itemId');
  if (!transactionId || !itemId) return { ok: false, error: 'Transaction ou fichier manquant' };

  try {
    const item = await getItemById(itemId);
    if (!item || !isInvoiceFile(item.name)) {
      return { ok: false, error: 'Facture OneDrive introuvable' };
    }

    await getDb().transaction.update({
      where: { id: transactionId },
      data: {
        attachmentItemId: item.id,
        attachmentUrl: item.webUrl,
      },
    });
    revalidateTransaction(transactionId);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Impossible de lier cette facture OneDrive' };
  }
}

export async function unlinkOneDriveInvoiceAction(formData: FormData): Promise<LinkInvoiceState> {
  await requireMutator();

  const transactionId = getString(formData, 'transactionId');
  if (!transactionId) return { ok: false, error: 'Transaction manquante' };

  await getDb().transaction.update({
    where: { id: transactionId },
    data: {
      attachmentItemId: null,
      attachmentUrl: null,
    },
  });
  revalidateTransaction(transactionId);
  return { ok: true };
}
