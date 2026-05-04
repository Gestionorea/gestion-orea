'use server';

import { extractInvoiceCached } from '@/lib/invoice-extractor';
import {
  downloadItemContent,
  listFolderItemsByPath,
  moveItemToFolder,
} from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';

const INBOX_FOLDER = 'Comptabilite/Facture scanner/inbox';
const TARGET_FOLDER = 'Comptabilite/Facture scanner';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_RUN = 30;

export type ScannerInboxItemResult = {
  originalFilename: string;
  newFilename: string | null;
  status: 'renamed' | 'extract_failed' | 'too_large' | 'unsupported' | 'move_failed';
  reason?: string;
  webUrl?: string;
};

export type ProcessScannerInboxResult = {
  ok: true;
  scanned: number;
  renamed: number;
  failed: number;
  items: ScannerInboxItemResult[];
};

function mimeTypeForFilename(filename: string): 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | null {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return null;
}

function sanitizeForFilename(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + '$';
}

function buildNewFilename(extracted: {
  date: string | null;
  fournisseur: string | null;
  montantTotal: number | null;
  lastDigitsCarte?: string | null;
}, ext: string): string {
  const datePart = extracted.date ?? 'sans-date';
  const fournisseurPart = extracted.fournisseur
    ? sanitizeForFilename(extracted.fournisseur)
    : 'Inconnu';
  const amountPart = extracted.montantTotal != null
    ? formatAmount(extracted.montantTotal)
    : 'sans-montant';
  const cardPart = extracted.lastDigitsCarte
    ? `_CC-${extracted.lastDigitsCarte}`
    : '';
  return `${datePart}_${fournisseurPart}_${amountPart}${cardPart}.${ext}`;
}

export async function processScannerInboxAction(
  _prevState: ProcessScannerInboxResult | null,
  _formData: FormData,
): Promise<ProcessScannerInboxResult> {
  await requireOwner();

  const items = await listFolderItemsByPath(INBOX_FOLDER);
  const results: ScannerInboxItemResult[] = [];
  let renamed = 0;
  let failed = 0;
  let processed = 0;

  for (const item of items) {
    if (processed >= MAX_FILES_PER_RUN) break;
    if (item.folder) continue;

    const mimeType = mimeTypeForFilename(item.name);
    if (!mimeType) {
      results.push({
        originalFilename: item.name,
        newFilename: null,
        status: 'unsupported',
        reason: 'Extension non supportée',
      });
      continue;
    }

    if (item.size > MAX_FILE_SIZE_BYTES) {
      results.push({
        originalFilename: item.name,
        newFilename: null,
        status: 'too_large',
        reason: `Fichier trop volumineux (${(item.size / 1024 / 1024).toFixed(1)}MB)`,
      });
      continue;
    }

    processed += 1;

    let buffer: Buffer;
    try {
      buffer = await downloadItemContent(item.id);
    } catch (e) {
      failed += 1;
      results.push({
        originalFilename: item.name,
        newFilename: null,
        status: 'extract_failed',
        reason: e instanceof Error ? e.message : 'Téléchargement impossible',
      });
      continue;
    }

    const extraction = await extractInvoiceCached(item.id, {
      base64: buffer.toString('base64'),
      mimeType,
      filename: item.name,
    });

    if (!extraction.ok) {
      failed += 1;
      results.push({
        originalFilename: item.name,
        newFilename: null,
        status: 'extract_failed',
        reason: extraction.error,
      });
      continue;
    }

    const ext = item.name.toLowerCase().split('.').pop() ?? 'pdf';
    const newName = buildNewFilename(
      {
        date: extraction.data.date,
        fournisseur: extraction.data.fournisseur,
        montantTotal: extraction.data.montantTotal,
        lastDigitsCarte: extraction.data.lastDigitsCarte ?? null,
      },
      ext,
    );

    try {
      const moved = await moveItemToFolder(item.id, TARGET_FOLDER, { newName });
      renamed += 1;
      results.push({
        originalFilename: item.name,
        newFilename: newName,
        status: 'renamed',
        webUrl: moved.webUrl,
      });
    } catch (e) {
      failed += 1;
      results.push({
        originalFilename: item.name,
        newFilename: newName,
        status: 'move_failed',
        reason: e instanceof Error ? e.message : 'Déplacement échoué',
      });
    }
  }

  return {
    ok: true,
    scanned: items.length,
    renamed,
    failed,
    items: results,
  };
}
