'use client';

import type { CategoryType } from '@prisma/client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createCategoryAction, updateCategoryAction, type CategoryActionState } from '@/app/actions/categories';
import type { CategoryItem } from '@/lib/categories';

const CATEGORY_TYPES: CategoryType[] = ['income', 'expense', 'both'];

function SubmitButton() {
  const t = useTranslations('perso.admin.categories');
  const { pending } = useFormStatus();
  return <button disabled={pending} className="mt-8 bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white">{pending ? t('form.submitting') : t('form.save')}</button>;
}

export default function CategoryForm({ category }: { category?: CategoryItem }) {
  const t = useTranslations('perso.admin.categories');
  const [state, formAction] = useActionState(category ? updateCategoryAction : createCategoryAction, { success: false } satisfies CategoryActionState);
  return (
    <form action={formAction} className="mt-8 grid max-w-xl gap-5">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <label className="block text-sm font-medium text-gray-700">{t('form.name')}<input name="name" defaultValue={category?.name ?? ''} required className="mt-2 w-full border border-gray-300 px-4 py-3" />{state.fieldErrors?.name ? <p className="mt-2 text-sm text-red-700">{t(`errors.${state.fieldErrors.name}` as Parameters<typeof t>[0])}</p> : null}</label>
      <label className="block text-sm font-medium text-gray-700">{t('form.type')}<select name="type" defaultValue={category?.type ?? 'both'} className="mt-2 w-full border border-gray-300 px-4 py-3">{CATEGORY_TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></label>
      <label className="block text-sm font-medium text-gray-700">{t('form.description')}<textarea name="description" defaultValue={category?.description ?? ''} rows={4} className="mt-2 w-full border border-gray-300 px-4 py-3" /></label>
      <SubmitButton />
    </form>
  );
}
