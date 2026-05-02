import type { Beneficiary, PaymentMethod, TransactionType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { getDb } from '@/lib/db';

export const TRANSACTION_TYPES: TransactionType[] = ['income', 'expense'];
export const PAYMENT_METHODS: PaymentMethod[] = [
  'interac',
  'credit_card',
  'cash',
  'wire',
  'check',
  'other',
];
export const BENEFICIARIES: Beneficiary[] = ['self', 'company', 'property'];

export type TransactionRow = {
  id: string;
  type: TransactionType;
  date: Date;
  merchantName: string;
  amountBeforeTax: string;
  gst: string | null;
  qst: string | null;
  amountTotal: string;
  paymentMethod: PaymentMethod;
  beneficiary: Beneficiary;
  invoiceNumber: string | null;
  justification: string | null;
  attachmentUrl: string | null;
  propertyId: string | null;
  companyId: string | null;
  categoryId: string | null;
  property: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  reconciledAt: Date | null;
  reconciledBy: { id: string; username: string } | null;
};

export type TransactionInput = {
  type: TransactionType;
  date: Date;
  merchantName: string;
  amountBeforeTax: string;
  gst?: string | null;
  qst?: string | null;
  amountTotal: string;
  paymentMethod: PaymentMethod;
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
  q?: string;
  sort?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  page: number;
};

const transactionInclude = {
  property: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  reconciledBy: { select: { id: true, username: true } },
} as const;

function serialize(transaction: {
  id: string;
  type: TransactionType;
  date: Date;
  merchantName: string;
  amountBeforeTax: Prisma.Decimal;
  gst: Prisma.Decimal | null;
  qst: Prisma.Decimal | null;
  amountTotal: Prisma.Decimal;
  paymentMethod: PaymentMethod;
  beneficiary: Beneficiary;
  invoiceNumber: string | null;
  justification: string | null;
  attachmentUrl: string | null;
  propertyId: string | null;
  companyId: string | null;
  categoryId: string | null;
  property: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  reconciledAt: Date | null;
  reconciledBy: { id: string; username: string } | null;
}): TransactionRow {
  return {
    ...transaction,
    amountBeforeTax: transaction.amountBeforeTax.toFixed(2),
    gst: transaction.gst?.toFixed(2) ?? null,
    qst: transaction.qst?.toFixed(2) ?? null,
    amountTotal: transaction.amountTotal.toFixed(2),
  };
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

function yearRange(year: number, month?: number) {
  const start = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const end = month ? new Date(year, month, 1) : new Date(year + 1, 0, 1);
  return { gte: start, lt: end };
}

function buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    date: yearRange(filters.year, filters.month),
  };

  if (filters.type) where.type = filters.type;
  if (filters.propertyId) where.propertyId = filters.propertyId;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.q) {
    where.OR = [
      { merchantName: { contains: filters.q, mode: 'insensitive' } },
      { justification: { contains: filters.q, mode: 'insensitive' } },
      { invoiceNumber: { contains: filters.q, mode: 'insensitive' } },
    ];
  }

  return where;
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
  const orderBy =
    filters.sort === 'date_asc'
      ? { date: 'asc' as const }
      : filters.sort === 'amount_desc'
        ? { amountTotal: 'desc' as const }
        : filters.sort === 'amount_asc'
          ? { amountTotal: 'asc' as const }
          : { date: 'desc' as const };
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

  return {
    rows: rows.map(serialize),
    count,
    pageSize,
    incomeTotal: income._sum.amountTotal?.toFixed(2) ?? '0.00',
    expenseTotal: expense._sum.amountTotal?.toFixed(2) ?? '0.00',
  };
}

export async function getTransactionById(id: string): Promise<TransactionRow | null> {
  const transaction = await getDb().transaction.findUnique({
    where: { id },
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
    paymentMethod: input.paymentMethod,
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
