import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { requireOwner } from '@/lib/permissions';
import { listPaymentSources } from '@/lib/paymentSources';
import SourceList from './SourceList';

export default async function PaymentSourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const raw = await searchParams;
  const archived = raw.archived === '1';
  setRequestLocale(locale);
  await requireOwner();
  const [t, sources] = await Promise.all([
    getTranslations('perso.admin.paymentSources'),
    listPaymentSources({ archived }),
  ]);

  return (
    <div className="py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
          <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
        </div>
        <Link
          href={`/${locale}/perso/admin/sources-paiement/nouveau`}
          className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white"
        >
          {t('add')}
        </Link>
      </div>
      <div className="mt-6 flex gap-4 text-sm">
        <Link href={`/${locale}/perso/admin/sources-paiement`} className={archived ? 'text-gray-500' : 'font-medium text-black'}>
          {t('active')}
        </Link>
        <Link href={`/${locale}/perso/admin/sources-paiement?archived=1`} className={archived ? 'font-medium text-black' : 'text-gray-500'}>
          {t('archived')}
        </Link>
      </div>
      <SourceList sources={sources} locale={locale} archived={archived} />
    </div>
  );
}
