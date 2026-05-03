import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type MerchantSummaryProps = {
  locale: string;
  back: string | null;
  summary: {
    merchantName: string;
    totalAmount: string;
    transactionCount: number;
    firstDate: Date;
    lastDate: Date;
    topCategoryName: string | null;
  };
};

export default async function MerchantSummary({ locale, back, summary }: MerchantSummaryProps) {
  const t = await getTranslations('perso.compta.merchant');
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
  const fallbackHref = `/${locale}/perso/comptabilite`;

  return (
    <div className="mt-8 border border-gray-200 bg-white p-6">
      <Link
        href={back ?? fallbackHref}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black"
      >
        ← {t('backToList')}
      </Link>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
          <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{summary.merchantName}</h1>
        </div>
        <div className="text-sm text-gray-500">
          {formatter.format(summary.firstDate)} - {formatter.format(summary.lastDate)}
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('total')}</p>
          <p className="mt-2 text-2xl font-medium text-black">${summary.totalAmount}</p>
        </div>
        <div className="border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('count')}</p>
          <p className="mt-2 text-2xl font-medium text-black">{summary.transactionCount}</p>
        </div>
        <div className="border border-gray-100 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">{t('topCategory')}</p>
          <p className="mt-2 text-2xl font-medium text-black">{summary.topCategoryName ?? '-'}</p>
        </div>
      </div>
    </div>
  );
}
