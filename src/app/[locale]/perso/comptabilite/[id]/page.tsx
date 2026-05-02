import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/permissions';
import { listCategories } from '@/lib/categories';
import { listCompanies } from '@/lib/companies';
import { listPaymentSources } from '@/lib/paymentSources';
import { listProperties } from '@/lib/properties';
import { getTransactionById } from '@/lib/transactions';
import EditTransactionForm from './EditTransactionForm';
import TransactionDetail from './TransactionDetail';

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [session, rawSearchParams, transaction] = await Promise.all([
    requireAuth(),
    searchParams,
    getTransactionById(id),
  ]);

  if (!transaction) notFound();

  const canEdit = ['owner', 'assistant'].includes(session.role);
  const editRequested = rawSearchParams.edit === '1';

  if (!editRequested || !canEdit) {
    return <TransactionDetail transaction={transaction} locale={locale} canEdit={canEdit} />;
  }

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
      <h1 className="mt-3 font-serif text-3xl tracking-[0.08em] text-black">{t('editTitle')}</h1>
      <EditTransactionForm transaction={transaction} properties={properties} companies={companies} categories={categories} paymentSources={paymentSources} />
    </div>
  );
}
