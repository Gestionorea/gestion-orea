import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { requireMutator } from '@/lib/permissions';
import { listCategories } from '@/lib/categories';
import { listCompanies } from '@/lib/companies';
import { listPaymentSources } from '@/lib/paymentSources';
import { listProperties } from '@/lib/properties';
import { getTransactionById } from '@/lib/transactions';
import EditTransactionForm from './EditTransactionForm';

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireMutator();
  const [t, transaction, properties, companies, categories, paymentSources] = await Promise.all([
    getTranslations('perso.compta'),
    getTransactionById(id),
    listProperties(),
    listCompanies(),
    listCategories(),
    listPaymentSources(),
  ]);

  if (!transaction) notFound();

  return (
    <div className="py-8">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-500">{t('eyebrow')}</p>
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('editTitle')}</h1>
      <EditTransactionForm transaction={transaction} properties={properties} companies={companies} categories={categories} paymentSources={paymentSources} />
    </div>
  );
}
