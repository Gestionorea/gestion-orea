'use server';

import {
  findBestMatch,
  findMatchByExtractedData,
  parseInvoiceFilename,
  type InvoiceFile,
  type MatchScore,
} from '@/lib/invoice-matcher';
import { extractInvoiceCached, type ExtractInput } from '@/lib/invoice-extractor';
import { getDb } from '@/lib/db';
import { downloadItemContent, listFolderItemsByPath, moveItemToFolder } from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';

export type AutoAttachInvoicesResult = {
  ok: true;
  year: number;
  month: number;
  transactionsExamined: number;
  invoicesAvailable: number;
  invoicesMoved: number;
  matchesCreated: number;
  matches: {
    txId: string;
    invoiceFilename: string;
    score: number;
    method?: 'text' | 'ai';
    fournisseur?: string | null;
  }[];
  aiMatches: number;
  aiCalls: number;
  aiMatchedDetails: {
    txId: string;
    invoiceFilename: string;
    fournisseur: string | null;
  }[];
};

type InvoiceWithSource = InvoiceFile & { source: 'inbox' | 'month'; itemSize: number };

const INBOX_FOLDER = 'Comptabilite/Facture scanner';
const COMPTA_BASE = 'Comptabilite';
const INVOICE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const MAX_AI_CALLS_PER_SYNC = 50;
const MAX_AI_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

function monthFolderPath(year: number, month: number): string {
  return `${COMPTA_BASE}/${year}/${MOIS_FR[month]}/Factures`;
}

function monthProcessedFolderPath(year: number, month: number): string {
  return `${COMPTA_BASE}/${year}/${MOIS_FR[month]}/Factures-Traitees`;
}

function isInvoiceFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return Array.from(INVOICE_EXTENSIONS).some((extension) => lower.endsWith(extension));
}

function mimeTypeForFilename(filename: string): ExtractInput['mimeType'] | null {
  const extension = filename.toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return null;
}

function emptyResult(year = 0, month = 0): AutoAttachInvoicesResult {
  return {
    ok: true,
    year,
    month,
    transactionsExamined: 0,
    invoicesAvailable: 0,
    invoicesMoved: 0,
    matchesCreated: 0,
    matches: [],
    aiMatches: 0,
    aiCalls: 0,
    aiMatchedDetails: [],
  };
}

function parseMonthScope(formData: FormData): { year: number; month: number } | null {
  const year = Number(formData.get('year'));
  const month = Number(formData.get('month'));
  if (
    !Number.isInteger(year) ||
    year < 2020 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}

function invoiceFromItem(item: { id: string; name: string; webUrl: string; size: number }, source: 'inbox' | 'month'): InvoiceWithSource {
  const parsed = parseInvoiceFilename(item.name);
  return {
    itemId: item.id,
    filename: item.name,
    webUrl: item.webUrl,
    parsedDate: parsed.parsedDate,
    parsedKeywords: parsed.parsedKeywords,
    parsedAmount: parsed.parsedAmount,
    source,
    itemSize: item.size,
  };
}

export async function autoAttachInvoicesAction(
  _prevState: AutoAttachInvoicesResult | null,
  formData: FormData,
): Promise<AutoAttachInvoicesResult> {
  await requireOwner();

  const scope = parseMonthScope(formData);
  if (!scope) return emptyResult();

  const { year, month } = scope;
  const monthFolder = monthFolderPath(year, month);
  const monthProcessedFolder = monthProcessedFolderPath(year, month);
  const db = getDb();
  const [inboxItems, monthItems] = await Promise.all([
    listFolderItemsByPath(INBOX_FOLDER),
    listFolderItemsByPath(monthFolder),
  ]);
  const invoices: InvoiceWithSource[] = [
    ...inboxItems.filter((item) => isInvoiceFile(item.name)).map((item) => invoiceFromItem(item, 'inbox')),
    ...monthItems.filter((item) => isInvoiceFile(item.name)).map((item) => invoiceFromItem(item, 'month')),
  ];

  if (invoices.length === 0) {
    return emptyResult(year, month);
  }

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 1));
  const transactions = await db.transaction.findMany({
    where: {
      attachmentUrl: null,
      date: { gte: startOfMonth, lt: endOfMonth },
    },
    orderBy: { date: 'desc' },
    take: 1000,
    select: {
      id: true,
      date: true,
      merchantName: true,
      amountTotal: true,
    },
  });

  const consumedInvoiceIds = new Set<string>();
  const attachedTxIds = new Set<string>();
  const matches: AutoAttachInvoicesResult['matches'] = [];
  const aiMatchedDetails: AutoAttachInvoicesResult['aiMatchedDetails'] = [];
  let aiCalls = 0;
  let invoicesMoved = 0;

  async function finalUrlForInvoice(invoice: InvoiceWithSource): Promise<string> {
    try {
      const moved = await moveItemToFolder(invoice.itemId, monthProcessedFolder);
      invoicesMoved += 1;
      return moved.webUrl;
    } catch (error) {
      console.error('[auto-attach] move failed', { itemId: invoice.itemId, error });
      return invoice.webUrl;
    }
  }

  for (const transaction of transactions) {
    const availableInvoices = invoices.filter((invoice) => !consumedInvoiceIds.has(invoice.itemId));
    const match: MatchScore | null = findBestMatch({
      transactionDate: transaction.date,
      transactionDescription: transaction.merchantName,
      transactionAmount: Number(transaction.amountTotal),
      invoices: availableInvoices,
    });

    if (!match) continue;
    const matchedInvoice = invoices.find((invoice) => invoice.itemId === match.invoiceItemId);
    const finalUrl = matchedInvoice ? await finalUrlForInvoice(matchedInvoice) : match.invoiceWebUrl;

    await db.transaction.update({
      where: { id: transaction.id },
      data: { attachmentUrl: finalUrl },
    });

    consumedInvoiceIds.add(match.invoiceItemId);
    attachedTxIds.add(transaction.id);
    matches.push({
      txId: transaction.id,
      invoiceFilename: match.invoiceFilename,
      score: match.score,
      method: 'text',
    });
  }

  for (const invoice of invoices.filter((item) => !consumedInvoiceIds.has(item.itemId))) {
    if (aiCalls >= MAX_AI_CALLS_PER_SYNC) break;

    const mimeType = mimeTypeForFilename(invoice.filename);
    if (!mimeType) continue;

    if (invoice.itemSize > MAX_AI_FILE_SIZE_BYTES) continue;

    try {
      const buffer = await downloadItemContent(invoice.itemId);
      if (buffer.byteLength > MAX_AI_FILE_SIZE_BYTES) continue;

      aiCalls += 1;
      const extraction = await extractInvoiceCached(invoice.itemId, {
        base64: buffer.toString('base64'),
        mimeType,
        filename: invoice.filename,
      });

      if (!extraction.ok) continue;

      const matchTxId = findMatchByExtractedData({
        extracted: {
          date: extraction.data.date ? new Date(`${extraction.data.date}T00:00:00Z`) : null,
          fournisseur: extraction.data.fournisseur,
          montantTotal: extraction.data.montantTotal,
        },
        transactions: transactions
          .filter((transaction) => !attachedTxIds.has(transaction.id))
          .map((transaction) => ({
            id: transaction.id,
            date: transaction.date,
            merchantName: transaction.merchantName,
            amountTotal: Number(transaction.amountTotal),
          })),
      });

      if (!matchTxId) continue;
      const finalUrl = await finalUrlForInvoice(invoice);

      await db.transaction.update({
        where: { id: matchTxId },
        data: { attachmentUrl: finalUrl },
      });

      consumedInvoiceIds.add(invoice.itemId);
      attachedTxIds.add(matchTxId);
      aiMatchedDetails.push({
        txId: matchTxId,
        invoiceFilename: invoice.filename,
        fournisseur: extraction.data.fournisseur,
      });
      matches.push({
        txId: matchTxId,
        invoiceFilename: invoice.filename,
        score: 100,
        method: 'ai',
        fournisseur: extraction.data.fournisseur,
      });
    } catch {
      continue;
    }
  }

  return {
    ok: true,
    year,
    month,
    transactionsExamined: transactions.length,
    invoicesAvailable: invoices.length,
    invoicesMoved,
    matchesCreated: matches.length,
    matches,
    aiMatches: aiMatchedDetails.length,
    aiCalls,
    aiMatchedDetails,
  };
}
