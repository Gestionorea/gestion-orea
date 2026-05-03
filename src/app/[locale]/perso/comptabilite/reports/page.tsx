import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireAuth } from '@/lib/permissions';
import { generateTaxReport, type TaxReportPeriod } from '@/lib/tax-report';
import TaxReport from './TaxReport';

type PeriodType = 'monthly' | 'quarterly' | 'annual';

function validMonth(value: unknown, fallback: number): number {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
}

function validQuarter(value: unknown): 1 | 2 | 3 | 4 {
  const quarter = Number(value);
  return quarter === 1 || quarter === 2 || quarter === 3 || quarter === 4 ? quarter : 1;
}

function parsePeriod(raw: Record<string, string | string[] | undefined>): {
  periodType: PeriodType;
  period: TaxReportPeriod;
} {
  const now = new Date();
  const year = Number(raw.year) || now.getFullYear();
  const rawPeriodType = typeof raw.periodType === 'string' ? raw.periodType : '';

  if (rawPeriodType === 'annual') {
    return { periodType: 'annual', period: { year } };
  }

  if (rawPeriodType === 'quarterly') {
    return { periodType: 'quarterly', period: { year, quarter: validQuarter(raw.quarter) } };
  }

  return {
    periodType: 'monthly',
    period: { year, month: validMonth(raw.month, now.getMonth() + 1) },
  };
}

export default async function ReportsPage({
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
  const { periodType, period } = parsePeriod(raw);
  const [t, monthNames, report] = await Promise.all([
    getTranslations('perso.reports'),
    getTranslations('perso.compta.months'),
    generateTaxReport(period),
  ]);

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
      <p className="mt-4 max-w-2xl text-sm text-gray-500">{t('subtitle')}</p>

      <form
        action={`/${locale}/perso/comptabilite/reports`}
        className="mt-8 grid gap-4 border border-gray-200 bg-white p-5 md:grid-cols-5"
      >
        <label className="grid gap-2 text-sm">
          <span className="font-medium text-black">{t('selectPeriod')}</span>
          <select name="periodType" defaultValue={periodType} className="border border-gray-300 px-3 py-2">
            <option value="monthly">{t('monthly')}</option>
            <option value="quarterly">{t('quarterly')}</option>
            <option value="annual">{t('annual')}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-black">{t('year')}</span>
          <input
            name="year"
            type="number"
            defaultValue={period.year}
            className="border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-black">{t('month')}</span>
          <select name="month" defaultValue={period.month ?? new Date().getMonth() + 1} className="border border-gray-300 px-3 py-2">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {monthNames(String(month))}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium text-black">{t('quarter')}</span>
          <select name="quarter" defaultValue={period.quarter ?? 1} className="border border-gray-300 px-3 py-2">
            {[1, 2, 3, 4].map((quarter) => (
              <option key={quarter} value={quarter}>
                Q{quarter}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">
            {t('generate')}
          </button>
        </div>
      </form>

      <TaxReport
        report={report}
        locale={locale}
        labels={{
          print: t('print'),
          table: {
            salesTaxable: t('table.salesTaxable'),
            gstCollected: t('table.gstCollected'),
            qstCollected: t('table.qstCollected'),
            purchasesTaxable: t('table.purchasesTaxable'),
            gstPaid: t('table.gstPaid'),
            qstPaid: t('table.qstPaid'),
            gstRemittance: t('table.gstRemittance'),
            qstRemittance: t('table.qstRemittance'),
          },
        }}
      />
    </div>
  );
}
