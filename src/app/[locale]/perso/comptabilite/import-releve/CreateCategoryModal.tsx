'use client';

import type { CategoryType } from '@prisma/client';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { createCategoryAction, type CategoryActionState } from '@/app/actions/categories';
import type { PreviewCategory } from '@/app/actions/analyze-statement';

function SubmitButton() {
  const t = useTranslations('perso.importStatement.createCategory');
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-black px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:bg-gray-400"
    >
      {pending ? t('submitting') : t('submit')}
    </button>
  );
}

export default function CreateCategoryModal({
  defaultType,
  onCancel,
  onCreated,
}: {
  defaultType: CategoryType;
  onCancel: () => void;
  onCreated: (category: PreviewCategory) => void;
}) {
  const t = useTranslations('perso.importStatement.createCategory');
  const [state, formAction] = useActionState<CategoryActionState, FormData>(createCategoryAction, {
    success: false,
  });

  useEffect(() => {
    if (state.success && state.category) {
      onCreated({
        id: state.category.id,
        name: state.category.name,
        type: state.category.type,
      });
    }
  }, [onCreated, state]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-lg border border-gray-300 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl tracking-[0.06em] text-black">{t('title')}</h2>
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-black">
            {t('cancel')}
          </button>
        </div>

        {state.similarCategory ? (
          <div className="mt-5 border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            <p>{t('similarFound', { name: state.similarCategory.name })}</p>
            <button
              type="button"
              onClick={() =>
                state.similarCategory
                  ? onCreated({
                      id: state.similarCategory.id,
                      name: state.similarCategory.name,
                      type: state.similarCategory.type,
                    })
                  : undefined
              }
              className="mt-3 border border-yellow-700 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-yellow-900 hover:bg-yellow-100"
            >
              {t('useSimilar', { name: state.similarCategory.name })}
            </button>
          </div>
        ) : null}

        {state.error && state.error !== 'duplicate' ? (
          <div className="mt-5 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        ) : null}

        <form action={formAction} className="mt-6 grid gap-4">
          <input type="hidden" name="redirect" value="false" />
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            {t('name')}
            <input name="name" required className="border border-gray-300 px-4 py-3 text-sm font-normal" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            {t('type')}
            <select
              name="type"
              defaultValue={defaultType}
              className="border border-gray-300 px-4 py-3 text-sm font-normal"
            >
              <option value="income">{t('typeIncome')}</option>
              <option value="expense">{t('typeExpense')}</option>
              <option value="both">{t('typeBoth')}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-gray-700">
            {t('description')}
            <textarea name="description" rows={3} className="border border-gray-300 px-4 py-3 text-sm font-normal" />
          </label>
          <div className="flex items-center gap-3">
            <SubmitButton />
            <button
              type="button"
              onClick={onCancel}
              className="border border-gray-300 px-4 py-3 text-xs font-medium uppercase tracking-[0.16em] text-gray-700 hover:border-black hover:text-black"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
