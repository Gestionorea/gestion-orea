import { getDb } from '@/lib/db';

function yearRange(year: number) {
  return {
    gte: new Date(year, 0, 1),
    lt: new Date(year + 1, 0, 1),
  };
}

function addToMap(map: Map<string, { total: number; count: number }>, key: string, amount: number) {
  const current = map.get(key) ?? { total: 0, count: 0 };
  current.total += amount;
  current.count += 1;
  map.set(key, current);
}

function sortedEntries(map: Map<string, { total: number; count: number }>) {
  return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
}

export async function statsByMonth(year: number): Promise<{ month: number; income: number; expense: number }[]> {
  const rows = await getDb().transaction.findMany({
    where: { date: yearRange(year) },
    select: { date: true, type: true, amountTotal: true },
  });
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    income: 0,
    expense: 0,
  }));

  for (const row of rows) {
    const bucket = months[row.date.getMonth()];
    bucket[row.type] += Number(row.amountTotal);
  }

  return months;
}

export async function statsByCategory(
  year: number,
  type: 'income' | 'expense',
): Promise<{ category: string; total: number; count: number }[]> {
  const rows = await getDb().transaction.findMany({
    where: { date: yearRange(year), type },
    select: {
      amountTotal: true,
      category: { select: { name: true } },
    },
  });
  const totals = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    addToMap(totals, row.category?.name ?? '__none__', Number(row.amountTotal));
  }

  return sortedEntries(totals).map(([category, value]) => ({ category, ...value }));
}

export async function topMerchants(
  year: number,
  limit: number = 10,
): Promise<{ merchantName: string; total: number; count: number }[]> {
  const rows = await getDb().transaction.findMany({
    where: { date: yearRange(year), type: 'expense' },
    select: { merchantName: true, amountTotal: true },
  });
  const totals = new Map<string, { total: number; count: number }>();

  for (const row of rows) {
    addToMap(totals, row.merchantName, Number(row.amountTotal));
  }

  return sortedEntries(totals)
    .slice(0, limit)
    .map(([merchantName, value]) => ({ merchantName, ...value }));
}

export async function topCompanies(year: number): Promise<{
  companyId: string;
  companyName: string;
  total: number;
  count: number;
}[]> {
  const rows = await getDb().transaction.findMany({
    where: { date: yearRange(year), type: 'expense' },
    select: {
      amountTotal: true,
      company: { select: { id: true, name: true } },
    },
  });
  const totals = new Map<string, { companyId: string; companyName: string; total: number; count: number }>();

  for (const row of rows) {
    const companyId = row.company?.id ?? 'none';
    const companyName = row.company?.name ?? '__none__';
    const current = totals.get(companyId) ?? { companyId, companyName, total: 0, count: 0 };
    current.total += Number(row.amountTotal);
    current.count += 1;
    totals.set(companyId, current);
  }

  return [...totals.values()].sort((a, b) => b.total - a.total);
}

export async function byPaymentSource(year: number): Promise<{
  sourceId: string | null;
  sourceName: string;
  total: number;
  count: number;
  isPersonal: boolean;
}[]> {
  const rows = await getDb().transaction.findMany({
    where: { date: yearRange(year), type: 'expense' },
    select: {
      amountTotal: true,
      paymentSource: { select: { id: true, name: true, isPersonal: true } },
    },
  });
  const totals = new Map<string, {
    sourceId: string | null;
    sourceName: string;
    total: number;
    count: number;
    isPersonal: boolean;
  }>();

  for (const row of rows) {
    const sourceId = row.paymentSource?.id ?? null;
    const key = sourceId ?? 'none';
    const current = totals.get(key) ?? {
      sourceId,
      sourceName: row.paymentSource?.name ?? '__none__',
      total: 0,
      count: 0,
      isPersonal: row.paymentSource?.isPersonal ?? false,
    };
    current.total += Number(row.amountTotal);
    current.count += 1;
    totals.set(key, current);
  }

  return [...totals.values()].sort((a, b) => b.total - a.total);
}

export async function advancesSummary(): Promise<{
  unreimbursedTotal: number;
  unreimbursedCount: number;
  reimbursedTotal: number;
  reimbursedCount: number;
}> {
  const rows = await getDb().transaction.findMany({
    where: { isAdvance: true },
    select: { amountTotal: true, reimbursedAt: true },
  });
  const summary = {
    unreimbursedTotal: 0,
    unreimbursedCount: 0,
    reimbursedTotal: 0,
    reimbursedCount: 0,
  };

  for (const row of rows) {
    const amount = Number(row.amountTotal);
    if (row.reimbursedAt) {
      summary.reimbursedTotal += amount;
      summary.reimbursedCount += 1;
    } else {
      summary.unreimbursedTotal += amount;
      summary.unreimbursedCount += 1;
    }
  }

  return summary;
}

async function totalsForYear(year: number) {
  const rows = await getDb().transaction.findMany({
    where: { date: yearRange(year) },
    select: { type: true, amountTotal: true },
  });

  return rows.reduce(
    (totals, row) => {
      totals[row.type] += Number(row.amountTotal);
      return totals;
    },
    { income: 0, expense: 0 },
  );
}

export async function yearSummary(year: number): Promise<{
  totalIncome: number;
  totalExpense: number;
  cashFlow: number;
  previousYearComparison: { income: number; expense: number };
}> {
  const [current, previous] = await Promise.all([totalsForYear(year), totalsForYear(year - 1)]);

  return {
    totalIncome: current.income,
    totalExpense: current.expense,
    cashFlow: current.income - current.expense,
    previousYearComparison: {
      income: current.income - previous.income,
      expense: current.expense - previous.expense,
    },
  };
}
