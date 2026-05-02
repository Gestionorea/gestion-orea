'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createTransactionAction, type TransactionActionState } from '@/app/actions/transactions';
import type { CategoryItem } from '@/lib/categories';
import type { CompanyItem } from '@/lib/companies';
import type { PaymentSourceItem } from '@/lib/paymentSources';
import type { PropertyItem } from '@/lib/properties';
import { fromBeforeTaxQC, fromTotalQC } from '@/lib/taxes';

const PAYMENT_METHODS = ['interac', 'credit_card', 'debit_card', 'cash', 'wire', 'check', 'preauthorized_debit', 'other'] as const;
const BENEFICIARIES = ['self', 'company', 'property'] as const;
const TAX_REGIMES = ['taxable_qc', 'exempt', 'manual'] as const;
type TaxRegime = (typeof TAX_REGIMES)[number];

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
  const [taxRegime, setTaxRegime] = useState<TaxRegime>('taxable_qc');
  const [manualNotice, setManualNotice] = useState(false);
  const selectedPaymentSource = paymentSources.find((source) => source.id === selectedPaymentSourceId);

  function handlePaymentSourceChange(sourceId: string) {
    setSelectedPaymentSourceId(sourceId);
    const source = paymentSources.find((item) => item.id === sourceId);
    if (source?.ownerCompanyId) {
      setSelectedCompanyId(source.ownerCompanyId);
    }
  }

  function handleTaxRegimeChange(nextRegime: TaxRegime) {
    setTaxRegime(nextRegime);
    setManualNotice(false);

    if (nextRegime === 'exempt') {
      setBeforeTax(amountTotal);
      setGst('0.00');
      setQst('0.00');
    }

    if (nextRegime === 'taxable_qc' && amountTotal) {
      const split = fromTotalQC(amountTotal);
      setBeforeTax(split.beforeTax);
      setGst(split.gst);
      setQst(split.qst);
    }
  }

  function handleTotalChange(value: string) {
    setAmountTotal(value);

    if (taxRegime === 'taxable_qc') {
      const split = fromTotalQC(value);
      setBeforeTax(split.beforeTax);
      setGst(split.gst);
      setQst(split.qst);
    }

    if (taxRegime === 'exempt') {
      setBeforeTax(value);
      setGst('0.00');
      setQst('0.00');
    }
  }

  function handleBeforeTaxChange(value: string) {
    setBeforeTax(value);

    if (taxRegime === 'taxable_qc') {
      const split = fromBeforeTaxQC(value);
      setGst(split.gst);
      setQst(split.qst);
      setAmountTotal(split.total);
    }
  }

  function switchTaxesToManual() {
    if (taxRegime !== 'taxable_qc') return;
    setTaxRegime('manual');
    setManualNotice(true);
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
      <div className="md:col-span-2">
        <p className="text-sm font-medium text-gray-700">{t('taxRegime.label')}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TAX_REGIMES.map((regime) => (
            <button
              key={regime}
              type="button"
              onClick={() => handleTaxRegimeChange(regime)}
              className={`border px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] ${
                taxRegime === regime
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 text-gray-700 hover:border-black'
              }`}
            >
              {t(`taxRegime.${regime}`)}
            </button>
          ))}
        </div>
        <input type="hidden" name="taxRegime" value={taxRegime} />
        <p className="mt-2 text-xs text-gray-500">{t('taxRegime.helpTaxableQC')}</p>
        {manualNotice ? <p className="mt-2 text-xs text-gray-500">{t('taxRegime.basculeManuel')}</p> : null}
        <FieldError state={state} field="taxRegime" />
      </div>
      <label className={taxRegime === 'exempt' ? 'block text-sm font-medium text-gray-700 md:col-span-2' : 'block text-sm font-medium text-gray-700'}>
        {t('form.amountTotal')}
        <input name="amountTotal" value={amountTotal} onChange={(event) => handleTotalChange(event.target.value)} required inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="amountTotal" />
      </label>
      {taxRegime === 'exempt' ? (
        <>
          <input type="hidden" name="amountBeforeTax" value={amountTotal} />
          <input type="hidden" name="gst" value="0.00" />
          <input type="hidden" name="qst" value="0.00" />
        </>
      ) : (
        <>
          <label className="block text-sm font-medium text-gray-700">
            {t('form.amountBeforeTax')}
            <input name="amountBeforeTax" value={beforeTax} onChange={(event) => handleBeforeTaxChange(event.target.value)} required inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
            <FieldError state={state} field="amountBeforeTax" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t('form.gst')}
            <input name="gst" value={gst} onFocus={switchTaxesToManual} onChange={(event) => setGst(event.target.value)} readOnly={taxRegime === 'taxable_qc'} inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
            <FieldError state={state} field="gst" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            {t('form.qst')}
            <input name="qst" value={qst} onFocus={switchTaxesToManual} onChange={(event) => setQst(event.target.value)} readOnly={taxRegime === 'taxable_qc'} inputMode="decimal" className="mt-2 w-full border border-gray-300 px-4 py-3" />
            <FieldError state={state} field="qst" />
          </label>
        </>
      )}
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
