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
import { downloadItemContent, listFolderItemsByPath } from '@/lib/onedrive';
import { requireOwner } from '@/lib/permissions';

export type AutoAttachInvoicesResult = {
  ok: true;
  transactionsExamined: number;
  invoicesAvailable: number;
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

const INVOICES_FOLDER = 'siagi/classification/a classer';
const INVOICE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);
const MAX_AI_CALLS_PER_SYNC = 50;
const MAX_AI_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const INVOICE_MATCH_DATE_WINDOW_DAYS = 90;

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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function boundsFromInvoices(invoices: InvoiceFile[]): { start: Date; end: Date } | null {
  const dates = invoices
    .map((invoice) => invoice.parsedDate)
    .filter((date): date is Date => Boolean(date));

  if (dates.length === 0) return null;

  const timestamps = dates.map((date) => date.getTime());
  return {
    start: addDays(new Date(Math.min(...timestamps)), -INVOICE_MATCH_DATE_WINDOW_DAYS),
    end: addDays(new Date(Math.max(...timestamps)), INVOICE_MATCH_DATE_WINDOW_DAYS),
  };
}

export async function autoAttachInvoicesAction(
  _prevState: AutoAttachInvoicesResult | null,
  _formData: FormData,
): Promise<AutoAttachInvoicesResult> {
  await requireOwner();

  const db = getDb();
  const invoiceItems = (await listFolderItemsByPath(INVOICES_FOLDER)).filter((item) =>
    isInvoiceFile(item.name),
  );
  const invoices: InvoiceFile[] = invoiceItems.map((item) => {
    const parsed = parseInvoiceFilename(item.name);
    return {
      itemId: item.id,
      filename: item.name,
      webUrl: item.webUrl,
      parsedDate: parsed.parsedDate,
      parsedKeywords: parsed.parsedKeywords,
      parsedAmount: parsed.parsedAmount,
    };
  });

  const bounds = boundsFromInvoices(invoices);
  if (invoices.length === 0) {
    return {
      ok: true,
      transactionsExamined: 0,
      invoicesAvailable: invoices.length,
      matchesCreated: 0,
      matches: [],
      aiMatches: 0,
      aiCalls: 0,
      aiMatchedDetails: [],
    };
  }

  const dateWhere = bounds
    ? {
        gte: bounds.start,
        lte: bounds.end,
      }
    : undefined;
  const transactions = await db.transaction.findMany({
    where: {
      attachmentUrl: null,
      ...(dateWhere ? { date: dateWhere } : {}),
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
  const sizeByInvoiceId = new Map(invoiceItems.map((item) => [item.id, item.size]));
  let aiCalls = 0;

  for (const transaction of transactions) {
    const availableInvoices = invoices.filter((invoice) => !consumedInvoiceIds.has(invoice.itemId));
    const match: MatchScore | null = findBestMatch({
      transactionDate: transaction.date,
      transactionDescription: transaction.merchantName,
      transactionAmount: Number(transaction.amountTotal),
      invoices: availableInvoices,
    });

    if (!match) continue;

    await db.transaction.update({
      where: { id: transaction.id },
      data: { attachmentUrl: match.invoiceWebUrl },
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

    const fileSize = sizeByInvoiceId.get(invoice.itemId) ?? 0;
    if (fileSize > MAX_AI_FILE_SIZE_BYTES) continue;

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

      await db.transaction.update({
        where: { id: matchTxId },
        data: { attachmentUrl: invoice.webUrl },
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
    transactionsExamined: transactions.length,
    invoicesAvailable: invoices.length,
    matchesCreated: matches.length,
    matches,
    aiMatches: aiMatchedDetails.length,
    aiCalls,
    aiMatchedDetails,
  };
}
