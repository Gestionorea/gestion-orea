import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireAuth } from '@/lib/permissions';
import {
  advancesSummary,
  byPaymentSource,
  statsByCategory,
  statsByMonth,
  topCompanies,
  topMerchants,
  yearSummary,
} from '@/lib/stats';
import { getTransactionYears, slugifyMerchantName } from '@/lib/transactions';
import AdvancesSummary from './AdvancesSummary';
import CategoryPie from './CategoryPie';
import MonthlyChart from './MonthlyChart';
import PaymentSourceBreakdown from './PaymentSourceBreakdown';
import StatsCard from './StatsCard';
import TopList from './TopList';
import YearSelector from './YearSelector';

function money(locale: string, value: number) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(value);
}

function delta(locale: string, value: number) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${money(locale, value)}`;
}

export default async function DashboardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAuth();
  const raw = await searchParams;
  const year = Number(raw.year) || new Date().getFullYear();
  const [t, years, monthly, categories, merchants, companies, sources, advances, summary] = await Promise.all([
    getTranslations('perso.compta.dashboards'),
    getTransactionYears(),
    statsByMonth(year),
    statsByCategory(year, 'expense'),
    topMerchants(year),
    topCompanies(year),
    byPaymentSource(year),
    advancesSummary(),
    yearSummary(year),
  ]);

  const monthData = monthly.map((item) => ({
    month: t(`months.${item.month}`),
    income: item.income,
    expense: item.expense,
  }));
  const categoryData = categories.map((item) => ({
    ...item,
    category: item.category === '__none__' ? t('noneCategory') : item.category,
  }));
  const companyData = companies.map((item) => ({
    ...item,
    companyName: item.companyName === '__none__' ? t('noneCompany') : item.companyName,
  }));
  const sourceData = sources.map((item) => ({
    ...item,
    sourceName: item.sourceName === '__none__' ? t('noneSource') : item.sourceName,
  }));

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
      <p className="mt-4 max-w-2xl text-sm text-gray-500">{t('subtitle', { year })}</p>

      <YearSelector years={years} activeYear={year} locale={locale} />

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatsCard label={t('cards.income')} value={money(locale, summary.totalIncome)} helper={delta(locale, summary.previousYearComparison.income)} />
        <StatsCard label={t('cards.expense')} value={money(locale, summary.totalExpense)} helper={delta(locale, summary.previousYearComparison.expense)} />
        <StatsCard label={t('cards.cashFlow')} value={money(locale, summary.cashFlow)} />
        <StatsCard label={t('cards.year')} value={String(year)} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <MonthlyChart
          title={t('charts.monthly')}
          incomeLabel={t('income')}
          expenseLabel={t('expense')}
          data={monthData}
        />
        <CategoryPie title={t('charts.categories')} emptyLabel={t('empty')} data={categoryData} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <TopList
          title={t('topMerchants')}
          emptyLabel={t('empty')}
          locale={locale}
          items={merchants.map((item) => ({
            label: item.merchantName,
            total: item.total,
            count: item.count,
            href: `/${locale}/perso/comptabilite/fournisseur/${slugifyMerchantName(item.merchantName)}?year=${year}`,
          }))}
        />
        <TopList
          title={t('topCompanies')}
          emptyLabel={t('empty')}
          locale={locale}
          items={companyData.map((item) => ({
            label: item.companyName,
            total: item.total,
            count: item.count,
          }))}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <PaymentSourceBreakdown
          title={t('paymentSources')}
          emptyLabel={t('empty')}
          personalLabel={t('personalAdvance')}
          locale={locale}
          items={sourceData}
        />
        <AdvancesSummary
          title={t('advances')}
          unreimbursedLabel={t('unreimbursed')}
          reimbursedLabel={t('reimbursed')}
          summary={advances}
          locale={locale}
        />
      </div>
    </div>
  );
}
