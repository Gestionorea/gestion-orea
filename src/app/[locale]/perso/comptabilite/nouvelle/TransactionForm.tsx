'use client';

import { useMemo, useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createTransactionAction, type TransactionActionState } from '@/app/actions/transactions';
import type { CategoryItem } from '@/lib/categories';
import type { CompanyItem } from '@/lib/companies';
import type { PaymentSourceItem } from '@/lib/paymentSources';
import type { PropertyItem } from '@/lib/properties';

const PAYMENT_METHODS = ['interac', 'credit_card', 'debit_card', 'cash', 'wire', 'check', 'preauthorized_debit', 'other'] as const;
const BENEFICIARIES = ['self', 'company', 'property'] as const;

function SubmitButton() {
  const t = useTranslations('perso.compta');
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{pending ? t('form.submitting') : t('form.save')}</button>;
}

function FieldError({ state, field }: { state: TransactionActionState; field: string }) {
  const t = useTranslations('perso.compta');
  const error = state.fieldErrors?.[field];
  return error ? <p className="mt-2 text-sm text-red-700">{t(`errors.${error}` as Parameters<typeof t>[0])}</p> : null;
}

export default function TransactionForm({
  properties,
  companies,
  categories,
  paymentSources,
}: {
  properties: PropertyItem[];
  companies: CompanyItem[];
  categories: CategoryItem[];
  paymentSources: PaymentSourceItem[];
}) {
  const t = useTranslations('perso.compta');
  const [state, formAction] = useActionState(createTransactionAction, { success: false });
  const [selectedPaymentSourceId, setSelectedPaymentSourceId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [beforeTax, setBeforeTax] = useState('');
  const [gst, setGst] = useState('');
  const [qst, setQst] = useState('');
  const [amountTotal, setAmountTotal] = useState('');
  const [manualTotal, setManualTotal] = useState(false);
  const total = useMemo(() => {
    const value = Number(beforeTax || 0) + Number(gst || 0) + Number(qst || 0);
    return Number.isFinite(value) ? value.toFixed(2) : '';
  }, [beforeTax, gst, qst]);
  const amountTotalValue = manualTotal ? amountTotal : total;
  const selectedPaymentSource = paymentSources.find((source) => source.id === selectedPaymentSourceId);

  function handlePaymentSourceChange(sourceId: string) {
    setSelectedPaymentSourceId(sourceId);
    const source = paymentSources.find((item) => item.id === sourceId);
    if (source?.ownerCompanyId) {
      setSelectedCompanyId(source.ownerCompanyId);
    }
  }

  return (
    <form action={formAction} className="mt-8 grid max-w-3xl gap-5 md:grid-cols-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('form.type')}
        <select name="type" className="mt-2 w-full border border-gray-300 px-4 py-3">
          <option value="expense">{t('types.expense')}</option>
          <option value="income">{t('types.income')}</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.date')}
        <input name="date" type="date" required className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="date" />
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('form.merchantName')}
        <input name="merchantName" required className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="merchantName" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.amountBeforeTax')}
        <input name="amountBeforeTax" value={beforeTax} onChange={(event) => setBeforeTax(event.target.value)} required inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="amountBeforeTax" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.gst')}
        <input name="gst" value={gst} onChange={(event) => setGst(event.target.value)} inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="gst" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.qst')}
        <input name="qst" value={qst} onChange={(event) => setQst(event.target.value)} inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="qst" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.amountTotal')}
        <input name="amountTotal" value={amountTotalValue} onChange={(event) => { setManualTotal(true); setAmountTotal(event.target.value); }} required inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="amountTotal" />
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('form.paymentSource')}
        <select
          name="paymentSourceId"
          value={selectedPaymentSourceId}
          onChange={(event) => handlePaymentSourceChange(event.target.value)}
          className="mt-2 w-full border border-gray-300 px-4 py-3"
        >
          <option value="">{t('form.paymentSourceNone')}</option>
          {paymentSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}{source.lastDigits ? ` ····${source.lastDigits}` : ''}
            </option>
          ))}
        </select>
        <FieldError state={state} field="paymentSourceId" />
      </label>
      <PaymentSourceInfo source={selectedPaymentSource} />
      <label className="block text-sm font-medium text-gray-700">
        {t('form.paymentMethod')}
        <select name="paymentMethod" className="mt-2 w-full border border-gray-300 px-4 py-3">
          {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{t(`paymentMethods.${method}`)}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.beneficiary')}
        <select name="beneficiary" className="mt-2 w-full border border-gray-300 px-4 py-3">
          {BENEFICIARIES.map((beneficiary) => <option key={beneficiary} value={beneficiary}>{t(`beneficiaries.${beneficiary}`)}</option>)}
        </select>
      </label>
      <Selects properties={properties} companies={companies} categories={categories} selectedCompanyId={selectedCompanyId} setSelectedCompanyId={setSelectedCompanyId} />
      <label className="block text-sm font-medium text-gray-700">
        {t('form.invoiceNumber')}
        <input name="invoiceNumber" className="mt-2 w-full border border-gray-300 px-4 py-3" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.attachmentUrl')}
        <input name="attachmentUrl" type="url" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <span className="mt-2 block text-xs text-gray-500">{t('form.attachmentHelp')}</span>
        <FieldError state={state} field="attachmentUrl" />
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('form.justification')}
        <textarea name="justification" rows={4} className="mt-2 w-full border border-gray-300 px-4 py-3" />
      </label>
      <SubmitButton />
    </form>
  );
}

function PaymentSourceInfo({ source }: { source?: PaymentSourceItem }) {
  const t = useTranslations('perso.compta');
  if (!source) return null;
  if (source.isPersonal) {
    return (
      <div className="md:col-span-2 rounded bg-yellow-100 px-4 py-3 text-sm text-yellow-800">
        {t('form.paymentSourcePersonal')}
      </div>
    );
  }
  if (source.ownerCompany) {
    return (
      <div className="md:col-span-2 rounded bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {t('form.paymentSourceAutofill')}: {source.ownerCompany.name}
      </div>
    );
  }
  return (
    <div className="md:col-span-2 rounded bg-gray-50 px-4 py-3 text-sm text-gray-500">
      {t('form.paymentSourceNoCompany')}
    </div>
  );
}

function Selects({
  properties,
  companies,
  categories,
  selectedCompanyId,
  setSelectedCompanyId,
}: {
  properties: PropertyItem[];
  companies: CompanyItem[];
  categories: CategoryItem[];
  selectedCompanyId: string;
  setSelectedCompanyId: (value: string) => void;
}) {
  const t = useTranslations('perso.compta');
  return (
    <>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.property')}
        <select name="propertyId" className="mt-2 w-full border border-gray-300 px-4 py-3">
          <option value="">{t('form.none')}</option>
          {properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.company')}
        <select name="companyId" value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)} className="mt-2 w-full border border-gray-300 px-4 py-3">
          <option value="">{t('form.none')}</option>
          {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('form.category')}
        <select name="categoryId" className="mt-2 w-full border border-gray-300 px-4 py-3">
          <option value="">{t('form.none')}</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
    </>
  );
}
