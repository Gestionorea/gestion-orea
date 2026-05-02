'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { updateTransactionAction, type TransactionActionState } from '@/app/actions/transactions';
import type { CategoryItem } from '@/lib/categories';
import type { CompanyItem } from '@/lib/companies';
import type { PropertyItem } from '@/lib/properties';
import type { TransactionRow } from '@/lib/transactions';

const PAYMENT_METHODS = ['interac', 'credit_card', 'cash', 'wire', 'check', 'other'] as const;
const BENEFICIARIES = ['self', 'company', 'property'] as const;

function SubmitButton() {
  const t = useTranslations('perso.compta');
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{pending ? t('form.submitting') : t('form.save')}</button>;
}

export default function EditTransactionForm({
  transaction,
  properties,
  companies,
  categories,
}: {
  transaction: TransactionRow;
  properties: PropertyItem[];
  companies: CompanyItem[];
  categories: CategoryItem[];
}) {
  const t = useTranslations('perso.compta');
  const [state, formAction] = useActionState(updateTransactionAction, { success: false });
  const errorFor = (field: string) => {
    const error = state.fieldErrors?.[field];
    return error ? <p className="mt-2 text-sm text-red-700">{t(`errors.${error}` as Parameters<typeof t>[0])}</p> : null;
  };

  return (
    <form action={formAction} className="mt-8 grid max-w-3xl gap-5 md:grid-cols-2">
      <input type="hidden" name="id" value={transaction.id} />
      <label className="block text-sm font-medium text-gray-700">
        {t('form.type')}
        <select name="type" defaultValue={transaction.type} className="mt-2 w-full border border-gray-300 px-4 py-3">
          <option value="expense">{t('types.expense')}</option>
          <option value="income">{t('types.income')}</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.date')}
        <input name="date" type="date" required defaultValue={transaction.date.toISOString().slice(0, 10)} className="mt-2 w-full border border-gray-300 px-4 py-3" />
        {errorFor('date')}
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('form.merchantName')}
        <input name="merchantName" required defaultValue={transaction.merchantName} className="mt-2 w-full border border-gray-300 px-4 py-3" />
        {errorFor('merchantName')}
      </label>
      {[
        ['amountBeforeTax', transaction.amountBeforeTax],
        ['gst', transaction.gst ?? ''],
        ['qst', transaction.qst ?? ''],
        ['amountTotal', transaction.amountTotal],
      ].map(([name, value]) => (
        <label key={name} className="block text-sm font-medium text-gray-700">
          {t(`form.${name}` as Parameters<typeof t>[0])}
          <input name={name} defaultValue={value} required={name === 'amountBeforeTax' || name === 'amountTotal'} inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
          {errorFor(name)}
        </label>
      ))}
      <label className="block text-sm font-medium text-gray-700">
        {t('form.paymentMethod')}
        <select name="paymentMethod" defaultValue={transaction.paymentMethod} className="mt-2 w-full border border-gray-300 px-4 py-3">
          {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{t(`paymentMethods.${method}`)}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.beneficiary')}
        <select name="beneficiary" defaultValue={transaction.beneficiary} className="mt-2 w-full border border-gray-300 px-4 py-3">
          {BENEFICIARIES.map((beneficiary) => <option key={beneficiary} value={beneficiary}>{t(`beneficiaries.${beneficiary}`)}</option>)}
        </select>
      </label>
      <Selects properties={properties} companies={companies} categories={categories} transaction={transaction} />
      <label className="block text-sm font-medium text-gray-700">
        {t('form.invoiceNumber')}
        <input name="invoiceNumber" defaultValue={transaction.invoiceNumber ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.attachmentUrl')}
        <input name="attachmentUrl" type="url" defaultValue={transaction.attachmentUrl ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3" />
        {errorFor('attachmentUrl')}
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('form.justification')}
        <textarea name="justification" rows={4} defaultValue={transaction.justification ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3" />
      </label>
      <SubmitButton />
    </form>
  );
}

function Selects({ properties, companies, categories, transaction }: { properties: PropertyItem[]; companies: CompanyItem[]; categories: CategoryItem[]; transaction: TransactionRow }) {
  const t = useTranslations('perso.compta');
  return (
    <>
      <label className="block text-sm font-medium text-gray-700">{t('form.property')}<select name="propertyId" defaultValue={transaction.propertyId ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3"><option value="">{t('form.none')}</option>{properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block text-sm font-medium text-gray-700">{t('form.company')}<select name="companyId" defaultValue={transaction.companyId ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3"><option value="">{t('form.none')}</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="block text-sm font-medium text-gray-700">{t('form.category')}<select name="categoryId" defaultValue={transaction.categoryId ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3"><option value="">{t('form.none')}</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </>
  );
}
