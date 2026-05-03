'use server';

import {
  isPaymentMethod,
  isTaxRegime,
  isTransactionSortBy,
  isTransactionSortOrder,
  isTransactionType,
  listTransactions,
  type TransactionFilters,
  type TransactionRow,
} from '@/lib/transactions';
import { exportTransactionsToXlsx } from '@/lib/excel-exporter';
import { requireAuth } from '@/lib/permissions';

export type ExportTransactionsXlsxFilters = {
  year: number;
  month?: number;
  type?: string;
  propertyId?: string;
  companyId?: string;
  categoryId?: string;
  paymentMethod?: string;
  taxRegime?: string;
  q?: string;
  sortBy?: string;
  sortOrder?: string;
};

export type ExportTransactionsXlsxResult =
  | { ok: true; xlsxBase64: string; filename: string }
  | { ok: false; error: string };

function cleanFilters(filters: ExportTransactionsXlsxFilters): Omit<TransactionFilters, 'page'> {
  return {
    year: Number.isFinite(filters.year) ? filters.year : new Date().getFullYear(),
    month: filters.month,
    type: filters.type && isTransactionType(filters.type) ? filters.type : undefined,
    propertyId: filters.propertyId || undefined,
    companyId: filters.companyId || undefined,
    categoryId: filters.categoryId || undefined,
    paymentMethod:
      filters.paymentMethod && isPaymentMethod(filters.paymentMethod) ? filters.paymentMethod : undefined,
    taxRegime: filters.taxRegime && isTaxRegime(filters.taxRegime) ? filters.taxRegime : undefined,
    q: filters.q || undefined,
    sortBy: filters.sortBy && isTransactionSortBy(filters.sortBy) ? filters.sortBy : undefined,
    sortOrder: filters.sortOrder && isTransactionSortOrder(filters.sortOrder) ? filters.sortOrder : undefined,
  };
}

async function listAllTransactions(filters: Omit<TransactionFilters, 'page'>): Promise<TransactionRow[]> {
  const firstPage = await listTransactions({ ...filters, page: 1 });
  const rows = [...firstPage.rows];
  const totalPages = Math.ceil(firstPage.count / firstPage.pageSize);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await listTransactions({ ...filters, page });
    rows.push(...nextPage.rows);
  }

  return rows;
}

function periodLabel(year: number, month?: number): string {
  if (!month) return String(year);
  return new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
}

function filename(year: number, month?: number): string {
  const monthPart = month ? `-${String(month).padStart(2, '0')}` : '';
  return `transactions-${year}${monthPart}.xlsx`;
}

export async function exportTransactionsXlsxAction(
  filters: ExportTransactionsXlsxFilters,
): Promise<ExportTransactionsXlsxResult> {
  await requireAuth();

  try {
    const cleaned = cleanFilters(filters);
    const transactions = await listAllTransactions(cleaned);
    const buffer = await exportTransactionsToXlsx({
      transactions,
      periodLabel: periodLabel(cleaned.year, cleaned.month),
    });

    return {
      ok: true,
      xlsxBase64: buffer.toString('base64'),
      filename: filename(cleaned.year, cleaned.month),
    };
  } catch {
    return { ok: false, error: 'Export Excel impossible.' };
  }
}
