'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createPropertyAction, updatePropertyAction, type PropertyActionState } from '@/app/actions/properties';
import type { CompanyItem } from '@/lib/companies';
import type { PropertyItem } from '@/lib/properties';

function SubmitButton() {
  const t = useTranslations('perso.admin.properties');
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{pending ? t('form.submitting') : t('form.save')}</button>;
}

export default function PropertyForm({ property, companies }: { property?: PropertyItem; companies: CompanyItem[] }) {
  const t = useTranslations('perso.admin.properties');
  const [state, formAction] = useActionState(property ? updatePropertyAction : createPropertyAction, { success: false } satisfies PropertyActionState);
  return (
    <form action={formAction} className="mt-8 grid max-w-xl gap-5">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}
      <label className="block text-sm font-medium text-gray-700">{t('form.name')}<input name="name" defaultValue={property?.name ?? ''} required className="mt-2 w-full border border-gray-300 px-4 py-3" />{state.fieldErrors?.name ? <p className="mt-2 text-sm text-red-700">{t(`errors.${state.fieldErrors.name}` as Parameters<typeof t>[0])}</p> : null}</label>
      <label className="block text-sm font-medium text-gray-700">{t('form.address')}<input name="address" defaultValue={property?.address ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3" /></label>
      <label className="block text-sm font-medium text-gray-700">{t('form.company')}<select name="companyId" defaultValue={property?.companyId ?? ''} className="mt-2 w-full border border-gray-300 px-4 py-3"><option value="">{t('form.none')}</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
      <SubmitButton />
    </form>
  );
}
