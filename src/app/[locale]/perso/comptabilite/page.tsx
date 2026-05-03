import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { requireAuth } from '@/lib/permissions';
import { listCategories } from '@/lib/categories';
import { listCompanies } from '@/lib/companies';
import { listProperties } from '@/lib/properties';
import {
  getTransactionYears,
  isPaymentMethod,
  isTaxRegime,
  isTransactionSortBy,
  isTransactionSortOrder,
  isTransactionType,
  listTransactions,
} from '@/lib/transactions';
import TransactionFilters from './TransactionFilters';
import TransactionList from './TransactionList';
import MonthNavigator from './MonthNavigator';
import YearTabs from './YearTabs';

export default async function AccountingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const year = Number(raw.year) || currentYear;
  const isAllMonthMode = raw.month === 'all';
  const rawMonth = typeof raw.month === 'string' ? Number(raw.month) : NaN;
  const parsedMonth = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : currentMonth;
  const month = isAllMonthMode ? undefined : parsedMonth;
  const page = Math.max(Number(raw.page) || 1, 1);
  const type = typeof raw.type === 'string' && isTransactionType(raw.type) ? raw.type : undefined;
  const legacySort = typeof raw.sort === 'string' ? raw.sort : '';
  const sortBy = typeof raw.sortBy === 'string' && isTransactionSortBy(raw.sortBy)
    ? raw.sortBy
    : legacySort.startsWith('amount')
      ? 'amount'
      : 'date';
  const sortOrder =
    typeof raw.sortOrder === 'string' && isTransactionSortOrder(raw.sortOrder)
      ? raw.sortOrder
      : legacySort.endsWith('asc')
        ? 'asc'
        : 'desc';
  const paymentMethod =
    typeof raw.paymentMethod === 'string' && isPaymentMethod(raw.paymentMethod)
      ? raw.paymentMethod
      : undefined;
  const taxRegime =
    typeof raw.taxRegime === 'string' && isTaxRegime(raw.taxRegime)
      ? raw.taxRegime
      : undefined;
  const session = await requireAuth();
  const [t, years, properties, companies, categories, result] = await Promise.all([
    getTranslations('perso.compta'),
    getTransactionYears(),
    listProperties(),
    listCompanies(),
    listCategories(),
    listTransactions({
      year,
      month,
      page,
      type,
      paymentMethod,
      taxRegime,
      propertyId: typeof raw.propertyId === 'string' ? raw.propertyId : undefined,
      companyId: typeof raw.companyId === 'string' ? raw.companyId : undefined,
      categoryId: typeof raw.categoryId === 'string' ? raw.categoryId : undefined,
      q: typeof raw.q === 'string' ? raw.q : undefined,
      sortBy,
      sortOrder,
    }),
  ]);
  const canMutate = ['owner', 'assistant'].includes(session.role);
  const canReconcile = ['owner', 'accountant'].includes(session.role);
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? '' : value ?? '']),
  );
  const activeMonth = isAllMonthMode ? 'all' : String(month);
  const activeSearchParams = { ...normalizedSearchParams, year: String(year), month: activeMonth };

  return (
    <div className="py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
          <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
          <p className="mt-4 text-sm text-gray-500">
            {t('summary', {
              count: result.count,
              income: result.incomeTotal,
              expense: result.expenseTotal,
            })}
          </p>
        </div>
        {canMutate ? (
          <Link
            href={`/${locale}/perso/comptabilite/nouvelle`}
            className="inline-flex bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white"
          >
            {t('newButton')}
          </Link>
        ) : null}
      </div>
      <YearTabs years={years} activeYear={year} locale={locale} />
      <MonthNavigator
        year={year}
        month={isAllMonthMode ? 'all' : parsedMonth}
        locale={locale}
        searchParams={normalizedSearchParams}
      />
      <TransactionFilters
        properties={properties}
        companies={companies}
        categories={categories}
        searchParams={activeSearchParams}
      />
      <TransactionList
        rows={result.rows}
        locale={locale}
        canMutate={canMutate}
        canReconcile={canReconcile}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchParams={activeSearchParams}
      />
      {result.count > result.pageSize ? (
        <div className="mt-8 flex items-center justify-between text-sm text-gray-500">
          {page > 1 ? (
            <Link href={{ pathname: `/${locale}/perso/comptabilite`, query: { ...activeSearchParams, page: page - 1 } }}>
              {t('pagination.previous')}
            </Link>
          ) : (
            <span />
          )}
          <span>{t('pagination.page', { page })}</span>
          {page * result.pageSize < result.count ? (
            <Link href={{ pathname: `/${locale}/perso/comptabilite`, query: { ...activeSearchParams, page: page + 1 } }}>
              {t('pagination.next')}
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
