import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireMutator } from '@/lib/permissions';
import { listCategories } from '@/lib/categories';
import { listCompanies } from '@/lib/companies';
import { listPaymentSources } from '@/lib/paymentSources';
import { listProperties } from '@/lib/properties';
import TransactionForm from './TransactionForm';

export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireMutator();
  const [t, properties, companies, categories, paymentSources] = await Promise.all([
    getTranslations('perso.compta'),
    listProperties(),
    listCompanies(),
    listCategories(),
    listPaymentSources(),
  ]);

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('newTitle')}</h1>
      <p className="mt-4 max-w-xl text-sm text-gray-500">{t('newSubtitle')}</p>
      <TransactionForm properties={properties} companies={companies} categories={categories} paymentSources={paymentSources} />
    </div>
  );
}
