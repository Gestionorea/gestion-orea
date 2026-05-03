'use server';

import {
  findBestMatch,
  parseInvoiceFilename,
  type InvoiceFile,
  type MatchScore,
} from '@/lib/invoice-matcher';
import { getDb } from '@/lib/db';
import { listFolderItemsByPath } from '@/lib/onedrive';
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
  }[];
};

const INVOICES_FOLDER = 'siagi/classification/a classer';
const INVOICE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

function isInvoiceFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return Array.from(INVOICE_EXTENSIONS).some((extension) => lower.endsWith(extension));
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
    start: addDays(new Date(Math.min(...timestamps)), -5),
    end: addDays(new Date(Math.max(...timestamps)), 5),
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
    };
  });

  const bounds = boundsFromInvoices(invoices);
  if (!bounds) {
    return {
      ok: true,
      transactionsExamined: 0,
      invoicesAvailable: invoices.length,
      matchesCreated: 0,
      matches: [],
    };
  }

  const transactions = await db.transaction.findMany({
    where: {
      attachmentUrl: null,
      date: {
        gte: bounds.start,
        lte: bounds.end,
      },
    },
    orderBy: { date: 'desc' },
    take: 1000,
    select: {
      id: true,
      date: true,
      merchantName: true,
    },
  });

  const consumedInvoiceIds = new Set<string>();
  const matches: AutoAttachInvoicesResult['matches'] = [];

  for (const transaction of transactions) {
    const availableInvoices = invoices.filter((invoice) => !consumedInvoiceIds.has(invoice.itemId));
    const match: MatchScore | null = findBestMatch({
      transactionDate: transaction.date,
      transactionDescription: transaction.merchantName,
      invoices: availableInvoices,
    });

    if (!match) continue;

    await db.transaction.update({
      where: { id: transaction.id },
      data: { attachmentUrl: match.invoiceWebUrl },
    });

    consumedInvoiceIds.add(match.invoiceItemId);
    matches.push({
      txId: transaction.id,
      invoiceFilename: match.invoiceFilename,
      score: match.score,
    });
  }

  return {
    ok: true,
    transactionsExamined: transactions.length,
    invoicesAvailable: invoices.length,
    matchesCreated: matches.length,
    matches,
  };
}
