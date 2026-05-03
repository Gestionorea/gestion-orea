import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireOwner } from '@/lib/permissions';
import { listPaymentSources } from '@/lib/paymentSources';
import UploadForm from './UploadForm';

export default async function ImportStatementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireOwner();

  const [t, paymentSources] = await Promise.all([
    getTranslations('perso.importStatement'),
    listPaymentSources({ archived: false }),
  ]);

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('title')}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">{t('subtitle')}</p>
      <UploadForm paymentSources={paymentSources} />
    </div>
  );
}
