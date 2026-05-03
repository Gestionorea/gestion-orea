'use client';

import type { CategoryType } from '@prisma/client';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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
  const locale = useLocale();
  const [state, formAction] = useActionState(category ? updateCategoryAction : createCategoryAction, { success: false } satisfies CategoryActionState);
  return (
    <form action={formAction} className="mt-8 grid max-w-xl gap-5">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      {state.similarCategoryId && state.similarCategoryName ? (
        <div className="border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <p>{t('errors.duplicate', { name: state.similarCategoryName })}</p>
          <Link
            href={`/${locale}/perso/admin/categories/${state.similarCategoryId}`}
            className="mt-2 inline-flex text-sm font-medium underline"
          >
            {t('errors.viewExisting')}
          </Link>
        </div>
      ) : null}
      <label className="block text-sm font-medium text-gray-700">{t('form.name')}<input name="name" defaultValue={category?.name ?? ''} required className="mt-2 w-full border border-gray-300 px-4 py-3" />{state.fieldErrors?.name ? <p className="mt-2 text-sm text-red-700">{t(`errors.${state.fieldErrors.name}` as Parameters<typeof t>[0])}</p> : null}</label>
      <label className="block text-sm font-medium text-gray-700">{t('form.type')}<select name="type" defaultValue={category?.type ?? 'both'} className="mt-2 w-full border border-gray-300 px-4 py-3">{CATEGORY_TYPES.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</select></label>
      <label className="block text-sm font-medium text-gray-700">{t('form.description')}<textarea name="description" defaultValue={category?.description ?? ''} rows={4} className="mt-2 w-full border border-gray-300 px-4 py-3" /></label>
      <SubmitButton />
    </form>
  );
}
