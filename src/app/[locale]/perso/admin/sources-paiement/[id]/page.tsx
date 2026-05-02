import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { listCompanies } from '@/lib/companies';
import { getPaymentSourceById } from '@/lib/paymentSources';
import { requireOwner } from '@/lib/permissions';
import PaymentSourceForm from './Form';

export default async function EditPaymentSourcePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireOwner();
  const [t, source, companies] = await Promise.all([
    getTranslations('perso.admin.paymentSources'),
    getPaymentSourceById(id),
    listCompanies(),
  ]);

  if (!source) notFound();

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('editTitle')}</h1>
      <PaymentSourceForm source={source} companies={companies} />
    </div>
  );
}
