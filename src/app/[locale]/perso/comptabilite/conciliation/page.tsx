import { getTranslations, setRequestLocale } from 'next-intl/server';
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
import { requireReconciler } from '@/lib/permissions';
import ConciliationList, { ExportXlsxButton } from './ConciliationList';

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

function parseFilters(raw: Record<string, string | string[] | undefined>): Omit<TransactionFilters, 'page'> {
  const now = new Date();
  const year = Number(raw.year) || now.getFullYear();
  const rawMonth = typeof raw.month === 'string' ? Number(raw.month) : NaN;
  const month =
    raw.month === 'all'
      ? undefined
      : Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
        ? rawMonth
        : now.getMonth() + 1;
  const legacySort = typeof raw.sort === 'string' ? raw.sort : '';

  return {
    year,
    month,
    type: typeof raw.type === 'string' && isTransactionType(raw.type) ? raw.type : undefined,
    paymentMethod:
      typeof raw.paymentMethod === 'string' && isPaymentMethod(raw.paymentMethod)
        ? raw.paymentMethod
        : undefined,
    taxRegime: typeof raw.taxRegime === 'string' && isTaxRegime(raw.taxRegime) ? raw.taxRegime : undefined,
    propertyId: typeof raw.propertyId === 'string' ? raw.propertyId : undefined,
    companyId: typeof raw.companyId === 'string' ? raw.companyId : undefined,
    categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : undefined,
    q: typeof raw.q === 'string' ? raw.q : undefined,
    sortBy:
      typeof raw.sortBy === 'string' && isTransactionSortBy(raw.sortBy)
        ? raw.sortBy
        : legacySort.startsWith('amount')
          ? 'amount'
          : 'date',
    sortOrder:
      typeof raw.sortOrder === 'string' && isTransactionSortOrder(raw.sortOrder)
        ? raw.sortOrder
        : legacySort.endsWith('asc')
          ? 'asc'
          : 'desc',
  };
}

export default async function ReconciliationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireReconciler();

  const raw = await searchParams;
  const filters = parseFilters(raw);
  const [t, rows] = await Promise.all([
    getTranslations('perso.reconciliation'),
    listAllTransactions(filters),
  ]);
  const reconciledCount = rows.filter((row) => row.reconciledAt).length;
  const totalCount = rows.length;
  const percent = totalCount > 0 ? Math.round((reconciledCount / totalCount) * 100) : 0;

  return (
    <div className="py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
          <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <ExportXlsxButton filters={filters} />
      </div>

      <div className="mt-8 border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="font-medium text-black">
            {t('stats', {
              reconciled: reconciledCount,
              total: totalCount,
              percent,
            })}
          </p>
          <span className="text-gray-500">{percent}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden bg-gray-100">
          <div className="h-full bg-blue-600" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ConciliationList rows={rows} locale={locale} />
    </div>
  );
}
