import type { Beneficiary, PaymentMethod, TaxRegime, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { suggestCategoryBatch } from '@/lib/categorization-learning';
import { getDb } from '@/lib/db';

export const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense'];
export const PAYMENT_METHODS: PaymentMethod[] = [
  'interac',
  'credit_card',
  'debit_card',
  'cash',
  'wire',
  'check',
  'preauthorized_debit',
  'other',
];
export const BENEFICIARIES: Beneficiary[] = ['self', 'company', 'property'];
export const TAX_REGIMES: TaxRegime[] = ['taxable_qc', 'exempt', 'manual'];

export type TransactionSortBy = 'date' | 'amount' | 'merchant' | 'company' | 'source';
export type TransactionSortOrder = 'asc' | 'desc';
export type TransactionVisualStatus = 'invoice_ok' | 'missing_invoice' | 'recurring_ok' | 'income' | 'neutral';

export type TransactionRow = {
  id: string;
  type: TransactionType;
  date: Date;
  merchantName: string;
  amountBeforeTax: string;
  gst: string | null;
  qst: string | null;
  amountTotal: string;
  taxRegime: TaxRegime;
  paymentMethod: PaymentMethod;
  paymentSourceId: string | null;
  paymentSource: {
    id: string;
    name: string;
    lastDigits: string | null;
    isPersonal: boolean;
    ownerCompanyId: string | null;
    ownerCompany: { id: string; name: string } | null;
    coOwners?: Array<{ id: string; companyId: string; companyName: string; percent: number }>;
  } | null;
  isAdvance: boolean;
  reimbursedAt: Date | null;
  beneficiary: Beneficiary;
  invoiceNumber: string | null;
  justification: string | null;
  attachmentUrl: string | null;
  propertyId: string | null;
  companyId: string | null;
  categoryId: string | null;
  property: { id: string; name: string; coOwners?: Array<{ id: string; companyId: string; companyName: string; percent: number }> } | null;
  company: { id: string; name: string } | null;
  companyDisplay?: string | null;
  category: { id: string; name: string } | null;
  createdBy: { id: string; username: string } | null;
  createdAt: Date;
  updatedAt: Date;
  reconciledAt: Date | null;
  reconciledBy: { id: string; username: string } | null;
  reimbursementTransactionId: string | null;
  reimbursementTransaction: RelatedTransaction | null;
  reimbursementOf: RelatedTransaction | null;
  visualStatus: TransactionVisualStatus;
};

export type RelatedTransaction = {
  id: string;
  date: Date;
  amountTotal: string;
  merchantName: string;
};

export type TransactionInput = {
  type: TransactionType;
  date: Date;
  merchantName: string;
  amountBeforeTax: string;
  gst?: string | null;
  qst?: string | null;
  amountTotal: string;
  taxRegime: TaxRegime;
  paymentMethod: PaymentMethod;
  paymentSourceId?: string | null;
  isAdvance?: boolean;
  propertyId?: string | null;
  companyId?: string | null;
  beneficiary: Beneficiary;
  invoiceNumber?: string | null;
  justification?: string | null;
  attachmentUrl?: string | null;
  categoryId?: string | null;
  createdById?: string;
};

export type TransactionFilters = {
  year: number;
  month?: number;
  type?: TransactionType;
  propertyId?: string;
  companyId?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  taxRegime?: TaxRegime;
  q?: string;
  merchantName?: string;
  sortBy?: TransactionSortBy;
  sortOrder?: TransactionSortOrder;
  page: number;
};

const transactionInclude = {
  property: {
    select: {
      id: true,
      name: true,
      coOwners: {
        select: {
          id: true,
          companyId: true,
          percent: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { percent: 'desc' },
      },
    },
  },
  company: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  paymentSource: {
    select: {
      id: true,
      name: true,
      lastDigits: true,
      isPersonal: true,
      ownerCompanyId: true,
      ownerCompany: { select: { id: true, name: true } },
      coOwners: {
        select: {
          id: true,
          companyId: true,
          percent: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { percent: 'desc' },
      },
    },
  },
  createdBy: { select: { id: true, username: true } },
  reconciledBy: { select: { id: true, username: true } },
  reimbursementTransaction: {
    select: {
      id: true,
      date: true,
      amountTotal: true,
      merchantName: true,
    },
  },
  reimbursementOf: {
    select: {
      id: true,
      date: true,
      amountTotal: true,
      merchantName: true,
    },
  },
} as const;

function serializeRelated(
  transaction: {
    id: string;
    date: Date;
    amountTotal: Prisma.Decimal;
    merchantName: string;
  } | null,
): RelatedTransaction | null {
  if (!transaction) return null;

  return {
    ...transaction,
    amountTotal: transaction.amountTotal.toFixed(2),
  };
}

function serialize(transaction: {
  id: string;
  type: TransactionType;
  date: Date;
  merchantName: string;
  amountBeforeTax: Prisma.Decimal;
  gst: Prisma.Decimal | null;
  qst: Prisma.Decimal | null;
  amountTotal: Prisma.Decimal;
  taxRegime: TaxRegime;
  paymentMethod: PaymentMethod;
  paymentSourceId: string | null;
  paymentSource: {
    id: string;
    name: string;
    lastDigits: string | null;
    isPersonal: boolean;
    ownerCompanyId: string | null;
    ownerCompany: { id: string; name: string } | null;
    coOwners: Array<{
      id: string;
      companyId: string;
      percent: Prisma.Decimal;
      company: { id: string; name: string };
    }>;
  } | null;
  isAdvance: boolean;
  reimbursedAt: Date | null;
  beneficiary: Beneficiary;
  invoiceNumber: string | null;
  justification: string | null;
  attachmentUrl: string | null;
  propertyId: string | null;
  companyId: string | null;
  categoryId: string | null;
  property: {
    id: string;
    name: string;
    coOwners: Array<{
      id: string;
      companyId: string;
      percent: Prisma.Decimal;
      company: { id: string; name: string };
    }>;
  } | null;
  company: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  createdBy: { id: string; username: string } | null;
  createdAt: Date;
  updatedAt: Date;
  reconciledAt: Date | null;
  reconciledBy: { id: string; username: string } | null;
  reimbursementTransactionId: string | null;
  reimbursementTransaction: {
    id: string;
    date: Date;
    amountTotal: Prisma.Decimal;
    merchantName: string;
  } | null;
  reimbursementOf: {
    id: string;
    date: Date;
    amountTotal: Prisma.Decimal;
    merchantName: string;
  } | null;
}, visualStatus?: TransactionVisualStatus): TransactionRow {
  const paymentSourceCoOwners =
    transaction.paymentSource?.coOwners.map((owner) => ({
      id: owner.id,
      companyId: owner.companyId,
      companyName: owner.company.name,
      percent: Number(owner.percent),
    })) ?? [];
  const propertyCoOwners =
    transaction.property?.coOwners.map((owner) => ({
      id: owner.id,
      companyId: owner.companyId,
      companyName: owner.company.name,
      percent: Number(owner.percent),
    })) ?? [];
  const companyDisplay =
    paymentSourceCoOwners.length > 1
      ? paymentSourceCoOwners.map((owner) => owner.companyName).join(' / ')
      : propertyCoOwners.length > 1
        ? propertyCoOwners.map((owner) => owner.companyName).join(' / ')
        : transaction.company?.name ?? null;

  return {
    ...transaction,
    paymentSource: transaction.paymentSource
      ? {
          ...transaction.paymentSource,
          coOwners: paymentSourceCoOwners,
        }
      : null,
    property: transaction.property
      ? {
          ...transaction.property,
          coOwners: propertyCoOwners,
        }
      : null,
    companyDisplay,
    amountBeforeTax: transaction.amountBeforeTax.toFixed(2),
    gst: transaction.gst?.toFixed(2) ?? null,
    qst: transaction.qst?.toFixed(2) ?? null,
    amountTotal: transaction.amountTotal.toFixed(2),
    reimbursementTransaction: serializeRelated(transaction.reimbursementTransaction),
    reimbursementOf: serializeRelated(transaction.reimbursementOf),
    visualStatus: visualStatus ?? baseVisualStatus(transaction),
  };
}

function baseVisualStatus(transaction: {
  type: TransactionType;
  attachmentUrl: string | null;
}): TransactionVisualStatus {
  if (transaction.type === 'income') return 'income';
  if (transaction.attachmentUrl) return 'invoice_ok';
  return 'missing_invoice';
}

function visualStatusForSuggestion(
  transaction: {
    type: TransactionType;
    attachmentUrl: string | null;
  },
  suggestionConfidence?: 'high' | 'medium' | 'low' | 'none',
): TransactionVisualStatus {
  if (transaction.type === 'income') return 'income';
  if (transaction.attachmentUrl) return 'invoice_ok';
  if (suggestionConfidence === 'high') return 'recurring_ok';
  return 'missing_invoice';
}

export function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

export function isBeneficiary(value: string): value is Beneficiary {
  return BENEFICIARIES.includes(value as Beneficiary);
}

export function isTaxRegime(value: string): value is TaxRegime {
  return TAX_REGIMES.includes(value as TaxRegime);
}

export function isTransactionSortBy(value: string): value is TransactionSortBy {
  return ['date', 'amount', 'merchant', 'company', 'source'].includes(value);
}

export function isTransactionSortOrder(value: string): value is TransactionSortOrder {
  return value === 'asc' || value === 'desc';
}

export function slugifyMerchantName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yearRange(year: number, month?: number) {
  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  return { gte: start, lt: end };
}

function buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    date: yearRange(filters.year, filters.month),
    deletedAt: null,
  };

  if (filters.type) where.type = filters.type;
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.taxRegime) where.taxRegime = filters.taxRegime;
  if (filters.merchantName) where.merchantName = filters.merchantName;
  if (filters.q) {
    where.OR = [
      { merchantName: { contains: filters.q, mode: 'insensitive' } },
      { justification: { contains: filters.q, mode: 'insensitive' } },
      { invoiceNumber: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  return where;
}

function buildOrderBy(filters: TransactionFilters): Prisma.TransactionOrderByWithRelationInput {
  const sortOrder = filters.sortOrder ?? 'desc';

  switch (filters.sortBy ?? 'date') {
    case 'amount':
      return { amountTotal: sortOrder };
    case 'merchant':
      return { merchantName: sortOrder };
    case 'company':
      return { company: { name: sortOrder } };
    case 'source':
      return { paymentSource: { name: sortOrder } };
    case 'date':
    default:
      return { date: sortOrder };
  }
}

export async function getTransactionYears(): Promise<number[]> {
  const aggregate = await getDb().transaction.aggregate({
    _min: { date: true },
    _max: { date: true },
  });
  const currentYear = new Date().getFullYear();
  const minYear = aggregate._min.date?.getFullYear() ?? currentYear;
  const maxYear = aggregate._max.date?.getFullYear() ?? currentYear;
  const years = new Set<number>([currentYear]);

  for (let year = minYear; year <= maxYear; year += 1) {
    years.add(year);
  }

  return [...years].sort((a, b) => b - a);
}

export async function listTransactions(filters: TransactionFilters) {
  const where = buildWhere(filters);
  const pageSize = 50;
  const orderBy = buildOrderBy(filters);
  const [rows, count, income, expense] = await Promise.all([
    getDb().transaction.findMany({
      where,
      include: transactionInclude,
      orderBy,
      skip: (filters.page - 1) * pageSize,
      take: pageSize,
    }),
    getDb().transaction.count({ where }),
    getDb().transaction.aggregate({
      where: { ...where, type: 'income' },
      _sum: { amountTotal: true },
    }),
    getDb().transaction.aggregate({
      where: { ...where, type: 'expense' },
      _sum: { amountTotal: true },
    }),
  ]);

  const expenseRows = rows.filter((row) => row.type === 'expense' && row.paymentSourceId);
  const suggestions = await suggestCategoryBatch(
    expenseRows.map((row) => ({
      paymentSourceId: row.paymentSourceId as string,
      description: row.merchantName,
    })),
  );
  const suggestionById = new Map(
    expenseRows.map((row, index) => [row.id, suggestions.get(index)]),
  );

  return {
    rows: rows.map((row) =>
      serialize(row, visualStatusForSuggestion(row, suggestionById.get(row.id)?.confidence)),
    ),
    count,
    pageSize,
    incomeTotal: income._sum.amountTotal?.toFixed(2) ?? '0.00',
    expenseTotal: expense._sum.amountTotal?.toFixed(2) ?? '0.00',
  };
}

export async function getMerchantNameBySlug(slug: string): Promise<string | null> {
  const merchants = await getDb().transaction.findMany({
    select: { merchantName: true },
    distinct: ['merchantName'],
  });

  return merchants.find((merchant) => slugifyMerchantName(merchant.merchantName) === slug)?.merchantName ?? null;
}

export async function getTransactionsByMerchant(
  merchantName: string,
  year?: number,
  sortBy: TransactionSortBy = 'date',
  sortOrder: TransactionSortOrder = 'desc',
) {
  const currentYear = year ?? new Date().getFullYear();
  return await listTransactions({
    year: currentYear,
    merchantName,
    page: 1,
    sortBy,
    sortOrder,
  });
}

export async function getMerchantSummary(merchantNameOrSlug: string): Promise<{
  merchantName: string;
  totalAmount: string;
  transactionCount: number;
  firstDate: Date;
  lastDate: Date;
  topCategoryName: string | null;
} | null> {
  const merchantName =
    (await getMerchantNameBySlug(merchantNameOrSlug)) || merchantNameOrSlug;

  const rows = await getDb().transaction.findMany({
    where: { merchantName },
    select: {
      date: true,
      amountTotal: true,
      category: { select: { name: true } },
    },
  });

  if (rows.length === 0) return null;

  const categoryTotals = new Map<string, number>();
  let totalAmount = 0;
  let firstDate = rows[0].date;
  let lastDate = rows[0].date;

  for (const row of rows) {
    totalAmount += Number(row.amountTotal);
    if (row.date < firstDate) firstDate = row.date;
    if (row.date > lastDate) lastDate = row.date;
    if (row.category?.name) {
      categoryTotals.set(row.category.name, (categoryTotals.get(row.category.name) ?? 0) + 1);
    }
  }

  const topCategoryName =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    merchantName,
    totalAmount: totalAmount.toFixed(2),
    transactionCount: rows.length,
    firstDate,
    lastDate,
    topCategoryName,
  };
}

export async function getTransactionById(id: string): Promise<TransactionRow | null> {
  const transaction = await getDb().transaction.findFirst({
    where: { id, deletedAt: null },
    include: transactionInclude,
  });

  return transaction ? serialize(transaction) : null;
}

function decimal(value: string | null | undefined): Prisma.Decimal | null {
  if (!value) return null;
  return new Prisma.Decimal(value);
}

function dataFromInput(input: TransactionInput) {
  return {
    type: input.type,
    date: input.date,
    merchantName: input.merchantName.trim(),
    amountBeforeTax: new Prisma.Decimal(input.amountBeforeTax),
    gst: decimal(input.gst),
    qst: decimal(input.qst),
    amountTotal: new Prisma.Decimal(input.amountTotal),
    taxRegime: input.taxRegime,
    paymentMethod: input.paymentMethod,
    paymentSourceId: input.paymentSourceId || null,
    isAdvance: input.isAdvance ?? false,
    propertyId: input.propertyId || null,
    companyId: input.companyId || null,
    beneficiary: input.beneficiary,
    invoiceNumber: input.invoiceNumber?.trim() || null,
    justification: input.justification?.trim() || null,
    attachmentUrl: input.attachmentUrl?.trim() || null,
    categoryId: input.categoryId || null,
  };
}

export async function createTransaction(input: TransactionInput & { createdById: string }) {
  return await getDb().transaction.create({
    data: {
      ...dataFromInput(input),
      createdById: input.createdById,
    },
  });
}

export async function updateTransaction(id: string, input: TransactionInput) {
  return await getDb().transaction.update({
    where: { id },
    data: dataFromInput(input),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await getDb().transaction.delete({ where: { id } });
}

export async function setTransactionReconciled(
  id: string,
  reconciled: boolean,
  reconciledById: string | null,
) {
  return await getDb().transaction.update({
    where: { id },
    data: {
      reconciledAt: reconciled ? new Date() : null,
      reconciledById: reconciled ? reconciledById : null,
    },
  });
}
