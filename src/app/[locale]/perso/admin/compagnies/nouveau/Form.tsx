'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createCompanyAction, updateCompanyAction, type ReferenceActionState } from '@/app/actions/companies';
import type { CompanyItem } from '@/lib/companies';

function SubmitButton() {
  const t = useTranslations('perso.admin.companies');
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{pending ? t('form.submitting') : t('form.save')}</button>;
}

export default function CompanyForm({ company }: { company?: CompanyItem }) {
  const t = useTranslations('perso.admin.companies');
  const [state, formAction] = useActionState(company ? updateCompanyAction : createCompanyAction, { success: false } satisfies ReferenceActionState);
  return (
    <form action={formAction} className="mt-8 max-w-xl">
      {company ? <input type="hidden" name="id" value={company.id} /> : null}
      <label className="block text-sm font-medium text-gray-700">
        {t('form.name')}
        <input name="name" defaultValue={company?.name ?? ''} required className="mt-2 w-full border border-gray-300 px-4 py-3" />
        {state.fieldErrors?.name ? <p className="mt-2 text-sm text-red-700">{t(`errors.${state.fieldErrors.name}` as Parameters<typeof t>[0])}</p> : null}
      </label>
      <SubmitButton />
    </form>
  );
}
