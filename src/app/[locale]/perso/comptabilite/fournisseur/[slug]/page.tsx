import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/permissions';
import {
  getMerchantSummary,
  getTransactionsByMerchant,
  getTransactionYears,
  isTransactionSortBy,
  isTransactionSortOrder,
} from '@/lib/transactions';
import TransactionList from '../../TransactionList';
import YearTabs from '../../YearTabs';
import MerchantSummary from './MerchantSummary';

export default async function MerchantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const raw = await searchParams;
  const session = await requireAuth();
  const t = await getTranslations('perso.compta');
  const summary = await getMerchantSummary(slug);

  if (!summary) notFound();

  const currentYear = new Date().getFullYear();
  const year = Number(raw.year) || currentYear;
  const sortBy = typeof raw.sortBy === 'string' && isTransactionSortBy(raw.sortBy) ? raw.sortBy : 'date';
  const sortOrder =
    typeof raw.sortOrder === 'string' && isTransactionSortOrder(raw.sortOrder) ? raw.sortOrder : 'desc';
  const [years, result] = await Promise.all([
    getTransactionYears(),
    getTransactionsByMerchant(summary.merchantName, year, sortBy, sortOrder),
  ]);
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? '' : value ?? '']),
  );

  return (
    <div className="py-8">
      <MerchantSummary locale={locale} summary={summary} />
      <YearTabs years={years} activeYear={year} locale={locale} />
      <p className="mt-8 text-sm text-gray-500">
        {t('summary', {
          count: result.count,
          income: result.incomeTotal,
          expense: result.expenseTotal,
        })}
      </p>
      <TransactionList
        rows={result.rows}
        locale={locale}
        canMutate={false}
        canReconcile={['owner', 'accountant'].includes(session.role)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchParams={{ ...normalizedSearchParams, year: String(year) }}
        basePath={`/${locale}/perso/comptabilite/fournisseur/${slug}`}
      />
    </div>
  );
}
