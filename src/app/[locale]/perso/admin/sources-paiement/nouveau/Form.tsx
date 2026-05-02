'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  createPaymentSourceAction,
  updatePaymentSourceAction,
  type PaymentSourceActionState,
} from '@/app/actions/paymentSources';
import type { CompanyItem } from '@/lib/companies';
import type { PaymentSourceItem } from '@/lib/paymentSources';

const KINDS = ['card', 'bank_account', 'cash', 'other'] as const;

function SubmitButton() {
  const t = useTranslations('perso.admin.paymentSources');
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{pending ? t('form.submitting') : t('form.save')}</button>;
}

function FieldError({ state, field }: { state: PaymentSourceActionState; field: string }) {
  const t = useTranslations('perso.admin.paymentSources');
  const error = state.fieldErrors?.[field];
  return error ? <p className="mt-2 text-sm text-red-700">{t(`errors.${error}` as Parameters<typeof t>[0])}</p> : null;
}

export default function PaymentSourceForm({
  source,
  companies,
}: {
  source?: PaymentSourceItem;
  companies: CompanyItem[];
}) {
  const t = useTranslations('perso.admin.paymentSources');
  const [isPersonal, setIsPersonal] = useState(source?.isPersonal ?? false);
  const [state, formAction] = useActionState(
    source ? updatePaymentSourceAction : createPaymentSourceAction,
    { success: false } satisfies PaymentSourceActionState,
  );

  return (
    <form action={formAction} className="mt-8 grid max-w-2xl gap-5 md:grid-cols-2">
      {source ? <input type="hidden" name="id" value={source.id} /> : null}
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('fields.name')}
        <input name="name" defaultValue={source?.name ?? ''} required maxLength={80} className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="name" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('fields.kind')}
        <select name="kind" defaultValue={source?.kind ?? 'card'} className="mt-2 w-full border border-gray-300 px-4 py-3">
          {KINDS.map((kind) => <option key={kind} value={kind}>{t(`kinds.${kind}`)}</option>)}
        </select>
        <FieldError state={state} field="kind" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        {t('fields.lastDigits')}
        <input name="lastDigits" defaultValue={source?.lastDigits ?? ''} inputMode="numeric" maxLength={4} pattern="\d{4}" className="mt-2 w-full border border-gray-300 px-4 py-3" />
        <FieldError state={state} field="lastDigits" />
      </label>
      <label className="flex items-center gap-3 text-sm font-medium text-gray-700 md:col-span-2">
        <input
          name="isPersonal"
          type="checkbox"
          checked={isPersonal}
          onChange={(event) => setIsPersonal(event.target.checked)}
          className="h-4 w-4 border-gray-300"
        />
        {t('fields.isPersonal')}
      </label>
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">
        {t('fields.owner')}
        <select
          name="ownerCompanyId"
          defaultValue={source?.ownerCompanyId ?? ''}
          disabled={isPersonal}
          className="mt-2 w-full border border-gray-300 px-4 py-3 disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">{t('form.none')}</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
        <FieldError state={state} field="ownerCompanyId" />
      </label>
      <SubmitButton />
    </form>
  );
}
